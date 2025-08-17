use std::fs;
use std::path::PathBuf;

use semver::Version;
use tauri::{AppHandle, Runtime};

use crate::{error::HoppError, path};

const MAX_BACKUP_COUNT: usize = 3;

#[tauri::command]
pub async fn check_and_backup_on_version_change<R: Runtime>(
    app: AppHandle<R>,
) -> Result<(), String> {
    let handle = app.clone();
    match tauri::async_runtime::spawn_blocking(move || perform_version_check_and_backup(handle))
        .await
    {
        Ok(Ok(_)) => Ok(()),
        Ok(Err(e)) => {
            tracing::error!(error = %e, "Backup operation failed");
            Err(e.to_string())
        }
        Err(e) => {
            tracing::error!(error = %e, "Backup task panicked");
            Err("Backup operation panicked".to_string())
        }
    }
}

pub fn perform_version_check_and_backup<R: Runtime>(app: AppHandle<R>) -> Result<(), HoppError> {
    let current_version = get_current_app_version(&app)?;

    tracing::info!(
        current_version = %current_version,
        "Version check initiated"
    );

    if !backup_exists_for_version(&current_version)? {
        tracing::info!(
            version = %current_version,
            "No backup found for current version, creating backup"
        );

        backup_current_data(&current_version)?;
        cleanup_old_backups()?;

        tracing::info!("Backup operation completed successfully");
    } else {
        tracing::debug!(
            version = %current_version,
            "Backup already exists for current version, skipping"
        );
    }

    Ok(())
}

fn get_current_app_version<R: Runtime>(app: &AppHandle<R>) -> Result<Version, HoppError> {
    let version_str = app.package_info().version.to_string();
    Version::parse(&version_str).map_err(|e| {
        tracing::error!(
            version_string = %version_str,
            error = %e,
            "Failed to parse current app version"
        );
        HoppError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("Invalid version format: {}", version_str),
        ))
    })
}

fn backup_exists_for_version(version: &Version) -> Result<bool, HoppError> {
    let backup_dir = path::backup_dir()?;
    let version_backup_dir = backup_dir.join(format!("backup-by-v{}", version));

    Ok(version_backup_dir.exists())
}

fn backup_current_data(current_version: &Version) -> Result<(), HoppError> {
    let config_dir = path::config_dir()?;
    let backup_dir = path::backup_dir()?;
    let version_backup_dir = backup_dir.join(format!("backup-by-v{}", current_version));

    if !config_dir.exists() {
        tracing::warn!("Config directory doesn't exist, skipping backup");
        return Ok(());
    }

    tracing::info!(
        source = %config_dir.display(),
        target = %version_backup_dir.display(),
        "Starting full config directory backup"
    );

    fs::create_dir_all(&version_backup_dir)?;

    // NOTE: This copies all contents of `config_dir` to `version_backup_dir`,
    // but excludes the `backup` and `latest` directories to avoid infinite recursion
    // and prevent backing up the current working data that might be in flux.
    copy_directory_contents_excluding_special_dirs(&config_dir, &version_backup_dir, &backup_dir)?;

    tracing::info!(
        target = %version_backup_dir.display(),
        "Full config backup completed successfully"
    );

    Ok(())
}

fn copy_directory_contents_excluding_special_dirs(
    src: &PathBuf,
    dst: &PathBuf,
    backup_dir: &PathBuf,
) -> Result<(), HoppError> {
    if !src.exists() {
        return Ok(());
    }

    let latest_dir = match path::latest_dir() {
        Ok(dir) => Some(dir),
        Err(e) => {
            tracing::warn!(error = %e, "Failed to get latest directory path");
            None
        }
    };

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path == *backup_dir {
            tracing::debug!(
                path = %src_path.display(),
                "Skipping backup directory to avoid recursion"
            );
            continue;
        }

        if let Some(ref latest_dir) = latest_dir {
            if src_path == *latest_dir {
                tracing::debug!(
                    path = %src_path.display(),
                    "Skipping latest directory to avoid backing up current working data"
                );
                continue;
            }
        }

        if src_path.is_dir() {
            copy_directory_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

fn copy_directory_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), HoppError> {
    if !src.exists() {
        return Ok(());
    }

    fs::create_dir_all(dst)?;

    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_directory_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }

    Ok(())
}

fn parse_version_from_backup_dirname(dirname: &str) -> Option<Version> {
    // Parse "backup-by-v1.2.3" format
    if let Some(version_part) = dirname.strip_prefix("backup-by-v") {
        Version::parse(version_part).ok()
    } else {
        None
    }
}

fn cleanup_old_backups() -> Result<(), HoppError> {
    let backup_dir = path::backup_dir()?;

    if !backup_dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(&backup_dir)?;
    let mut version_paths = Vec::new();

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            if let Some(dirname) = path.file_name().and_then(|n| n.to_str()) {
                if let Some(version) = parse_version_from_backup_dirname(dirname) {
                    version_paths.push((version, path));
                }
            }
        }
    }

    if version_paths.len() <= MAX_BACKUP_COUNT {
        return Ok(());
    }

    version_paths.sort_by(|a, b| a.0.cmp(&b.0));

    let to_remove_count = version_paths.len() - MAX_BACKUP_COUNT;
    let to_remove = &version_paths[..to_remove_count];

    for (version, path) in to_remove {
        tracing::info!(
            version = %version,
            path = %path.display(),
            "Removing old backup"
        );

        match fs::remove_dir_all(path) {
            Ok(_) => {
                tracing::debug!(
                    version = %version,
                    "Successfully removed old backup"
                );
            }
            Err(e) => {
                tracing::warn!(
                    version = %version,
                    error = %e,
                    "Failed to remove old backup, continuing"
                );
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_parse_version_from_backup_dirname() {
        // Valid cases
        assert_eq!(
            parse_version_from_backup_dirname("backup-by-v1.2.3"),
            Some(Version::new(1, 2, 3))
        );
        assert_eq!(
            parse_version_from_backup_dirname("backup-by-v10.0.0"),
            Some(Version::new(10, 0, 0))
        );
        assert_eq!(
            parse_version_from_backup_dirname("backup-by-v2.1.0-beta.1"),
            Version::parse("2.1.0-beta.1").ok()
        );

        // Invalid cases
        assert_eq!(parse_version_from_backup_dirname("backup-v1.2.3"), None);
        assert_eq!(parse_version_from_backup_dirname("v1.2.3"), None);
        assert_eq!(parse_version_from_backup_dirname("backup-by-v"), None);
        assert_eq!(
            parse_version_from_backup_dirname("backup-by-vinvalid"),
            None
        );
        assert_eq!(parse_version_from_backup_dirname(""), None);
        assert_eq!(parse_version_from_backup_dirname("random-dir"), None);
    }

    #[test]
    fn test_max_backup_count_constant() {
        assert_eq!(MAX_BACKUP_COUNT, 3);
    }

    #[test]
    fn test_copy_directory_recursive_empty_dir() {
        let temp_dir = TempDir::new().unwrap();
        let src = temp_dir.path().join("src");
        let dst = temp_dir.path().join("dst");

        fs::create_dir_all(&src).unwrap();

        let result = copy_directory_recursive(&src, &dst);
        assert!(result.is_ok());
        assert!(dst.exists());
        assert!(dst.is_dir());
    }

    #[test]
    fn test_copy_directory_recursive_with_files() {
        let temp_dir = TempDir::new().unwrap();
        let src = temp_dir.path().join("src");
        let dst = temp_dir.path().join("dst");

        fs::create_dir_all(&src).unwrap();
        fs::write(src.join("test.txt"), "test content").unwrap();
        fs::create_dir_all(src.join("subdir")).unwrap();
        fs::write(src.join("subdir").join("nested.txt"), "nested content").unwrap();

        let result = copy_directory_recursive(&src, &dst);
        assert!(result.is_ok());

        assert!(dst.exists());
        assert!(dst.join("test.txt").exists());
        assert!(dst.join("subdir").exists());
        assert!(dst.join("subdir").join("nested.txt").exists());

        let content = fs::read_to_string(dst.join("test.txt")).unwrap();
        assert_eq!(content, "test content");

        let nested_content = fs::read_to_string(dst.join("subdir").join("nested.txt")).unwrap();
        assert_eq!(nested_content, "nested content");
    }

    #[test]
    fn test_copy_directory_recursive_nonexistent_src() {
        let temp_dir = TempDir::new().unwrap();
        let src = temp_dir.path().join("nonexistent");
        let dst = temp_dir.path().join("dst");

        let result = copy_directory_recursive(&src, &dst);
        assert!(result.is_ok()); // Should return Ok for nonexistent source
        assert!(!dst.exists()); // Destination should not be created
    }

    #[test]
    fn test_version_sorting_in_cleanup() {
        let versions = vec![
            Version::new(1, 0, 0),
            Version::new(2, 1, 0),
            Version::new(1, 5, 0),
            Version::new(2, 0, 0),
        ];

        let mut version_paths: Vec<(Version, PathBuf)> = versions
            .into_iter()
            .map(|v| {
                (
                    v.clone(),
                    PathBuf::from(format!("backup-by-v{}", v.clone())),
                )
            })
            .collect();

        version_paths.sort_by(|a, b| a.0.cmp(&b.0));

        // Should be sorted: 1.0.0, 1.5.0, 2.0.0, 2.1.0
        assert_eq!(version_paths[0].0, Version::new(1, 0, 0));
        assert_eq!(version_paths[1].0, Version::new(1, 5, 0));
        assert_eq!(version_paths[2].0, Version::new(2, 0, 0));
        assert_eq!(version_paths[3].0, Version::new(2, 1, 0));
    }

    #[test]
    fn test_cleanup_old_backups_integration() {
        let temp_dir = TempDir::new().unwrap();
        let backup_root = temp_dir.path();

        let backup_dirs = vec![
            "backup-by-v1.0.0",
            "backup-by-v1.1.0",
            "backup-by-v1.2.0",
            "backup-by-v2.0.0",
            "backup-by-v2.1.0", // This should be kept (newest 3)
            "backup-by-v2.2.0", // This should be kept
            "backup-by-v3.0.0", // This should be kept
            "not-a-backup-dir", // This should be ignored
        ];

        for dir in &backup_dirs {
            fs::create_dir_all(backup_root.join(dir)).unwrap();
        }

        let entries = fs::read_dir(backup_root).unwrap();
        let mut version_paths = Vec::new();

        for entry in entries {
            let entry = entry.unwrap();
            let path = entry.path();

            if path.is_dir() {
                if let Some(dirname) = path.file_name().and_then(|n| n.to_str()) {
                    if let Some(version) = parse_version_from_backup_dirname(dirname) {
                        version_paths.push((version, path));
                    }
                }
            }
        }

        version_paths.sort_by(|a, b| a.0.cmp(&b.0));

        // Should have 7 valid backup directories (excluding "not-a-backup-dir")
        assert_eq!(version_paths.len(), 7);

        // If MAX_BACKUP_COUNT is 3, we should remove 4 directories
        let should_remove = version_paths.len() > MAX_BACKUP_COUNT;
        assert!(should_remove);

        if should_remove {
            let to_remove_count = version_paths.len() - MAX_BACKUP_COUNT;
            assert_eq!(to_remove_count, 4);

            // The oldest versions should be marked for removal
            assert_eq!(version_paths[0].0, Version::new(1, 0, 0));
            assert_eq!(version_paths[1].0, Version::new(1, 1, 0));
            assert_eq!(version_paths[2].0, Version::new(1, 2, 0));
            assert_eq!(version_paths[3].0, Version::new(2, 0, 0));
        }
    }
}
