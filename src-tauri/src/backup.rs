//! Respaldo de la base de datos al cambiar de versión.
//!
//! Al arrancar una versión distinta de la que se ejecutó por última vez, copia `rabit.db` a
//! `rabit.backup-<versión anterior>.db` (junto con su `-wal`, si existe) y conserva solo los 3 respaldos más recientes.
//! Las migraciones del esquema corren después, en el frontend, sobre la base original: si algo sale mal, el respaldo
//! tiene los datos tal como estaban antes de actualizar.
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// Cuántos respaldos se conservan.
pub const KEEP: usize = 3;
const DB: &str = "rabit.db";
const MARKER: &str = "last_version.txt";
const PREFIX: &str = "rabit.backup-";

/// Deja solo letras, números, `.`, `_` y `-` (el nombre de versión termina dentro de un nombre de archivo).
fn clean(label: &str) -> String {
  let c: String = label.chars().filter(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-')).collect();
  if c.is_empty() { "unknown".into() } else { c }
}

fn sidecar(db: &Path, suffix: &str) -> PathBuf {
  let mut s = db.as_os_str().to_owned();
  s.push(suffix);
  PathBuf::from(s)
}

/// Si `current` difiere de la versión guardada, respalda la base y actualiza la marca. Devuelve el respaldo creado.
pub fn backup_on_upgrade(dir: &Path, current: &str) -> io::Result<Option<PathBuf>> {
  fs::create_dir_all(dir)?;
  let marker = dir.join(MARKER);
  let previous = fs::read_to_string(&marker).ok().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
  if previous.as_deref() == Some(current) {
    return Ok(None);
  }
  let db = dir.join(DB);
  let mut made = None;
  if db.exists() {
    let label = clean(previous.as_deref().unwrap_or("pre-updater"));
    let dest = dir.join(format!("{PREFIX}{label}.db"));
    fs::copy(&db, &dest)?;
    for ext in ["-wal", "-shm"] {
      let src = sidecar(&db, ext);
      if src.exists() {
        fs::copy(&src, sidecar(&dest, ext))?;
      }
    }
    made = Some(dest);
  }
  fs::write(&marker, current)?;
  prune(dir, KEEP)?;
  Ok(made)
}

/// Borra los respaldos más antiguos y deja `keep`.
pub fn prune(dir: &Path, keep: usize) -> io::Result<()> {
  let mut backups: Vec<(SystemTime, PathBuf)> = fs::read_dir(dir)?
    .filter_map(|e| e.ok())
    .filter(|e| {
      let n = e.file_name().to_string_lossy().into_owned();
      n.starts_with(PREFIX) && n.ends_with(".db")
    })
    .map(|e| (e.metadata().and_then(|m| m.modified()).unwrap_or(SystemTime::UNIX_EPOCH), e.path()))
    .collect();
  backups.sort_by_key(|b| std::cmp::Reverse(b.0));
  for (_, path) in backups.into_iter().skip(keep) {
    let _ = fs::remove_file(sidecar(&path, "-wal"));
    let _ = fs::remove_file(sidecar(&path, "-shm"));
    fs::remove_file(path)?;
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::sync::atomic::{AtomicU32, Ordering};

  fn tmp() -> PathBuf {
    static N: AtomicU32 = AtomicU32::new(0);
    let d = std::env::temp_dir().join(format!("rabit-backup-test-{}-{}", std::process::id(), N.fetch_add(1, Ordering::SeqCst)));
    let _ = fs::remove_dir_all(&d);
    fs::create_dir_all(&d).unwrap();
    d
  }

  #[test]
  fn first_run_without_a_database_only_records_the_version() {
    let d = tmp();
    assert!(backup_on_upgrade(&d, "0.2.0").unwrap().is_none());
    assert_eq!(fs::read_to_string(d.join(MARKER)).unwrap(), "0.2.0");
  }

  #[test]
  fn same_version_does_not_back_up() {
    let d = tmp();
    fs::write(d.join(DB), b"data").unwrap();
    fs::write(d.join(MARKER), "0.2.0").unwrap();
    assert!(backup_on_upgrade(&d, "0.2.0").unwrap().is_none());
  }

  #[test]
  fn a_new_version_backs_up_the_database_named_after_the_previous_version() {
    let d = tmp();
    fs::write(d.join(DB), b"data").unwrap();
    fs::write(sidecar(&d.join(DB), "-wal"), b"wal").unwrap();
    fs::write(d.join(MARKER), "0.1.0").unwrap();
    let b = backup_on_upgrade(&d, "0.2.0").unwrap().unwrap();
    assert_eq!(b.file_name().unwrap().to_string_lossy(), "rabit.backup-0.1.0.db");
    assert_eq!(fs::read(&b).unwrap(), b"data");
    assert_eq!(fs::read(sidecar(&b, "-wal")).unwrap(), b"wal");
    assert_eq!(fs::read(d.join(DB)).unwrap(), b"data"); // la original no se toca
    assert_eq!(fs::read_to_string(d.join(MARKER)).unwrap(), "0.2.0");
  }

  #[test]
  fn only_the_three_newest_backups_are_kept() {
    let d = tmp();
    for (i, v) in ["0.1.0", "0.2.0", "0.3.0", "0.4.0", "0.5.0"].iter().enumerate() {
      fs::write(d.join(DB), format!("db{i}")).unwrap();
      fs::write(d.join(MARKER), v).unwrap();
      backup_on_upgrade(&d, &format!("{v}-next")).unwrap();
      std::thread::sleep(std::time::Duration::from_millis(30)); // distinguir las fechas de modificación
    }
    let mut names: Vec<String> = fs::read_dir(&d)
      .unwrap()
      .filter_map(|e| e.ok())
      .map(|e| e.file_name().to_string_lossy().into_owned())
      .filter(|n| n.starts_with(PREFIX))
      .collect();
    names.sort();
    assert_eq!(names, vec!["rabit.backup-0.3.0.db", "rabit.backup-0.4.0.db", "rabit.backup-0.5.0.db"]);
  }

  #[test]
  fn version_labels_are_safe_file_names() {
    assert_eq!(clean("1.2.3-beta/../x"), "1.2.3-beta..x");
    assert_eq!(clean("///"), "unknown");
  }
}
