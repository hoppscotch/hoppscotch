/// This is just `webapp-server`'s bundler part as a CLI
use std::fs::File;
use std::io::{Cursor, Write};
use std::path::PathBuf;

use clap::Parser;
use rayon::prelude::*;
use thiserror::Error;
use walkdir::WalkDir;
use zip::{ZipWriter, write::SimpleFileOptions};

#[derive(Error, Debug)]
pub enum BundlerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid path: {0}")]
    InvalidPath(String),

    #[error("Configuration error: {0}")]
    Config(String),
}

type Result<T> = std::result::Result<T, BundlerError>;

#[derive(Parser, Debug)]
#[command(author, version, about = "Creates a bundle from a directory")]
struct Args {
    /// Path to the directory to bundle
    #[arg(short, long)]
    input: PathBuf,

    /// Output path for the bundle
    #[arg(short, long)]
    output: PathBuf,

    /// Path to save the manifest file (optional)
    #[arg(short, long)]
    manifest: Option<PathBuf>,

    /// Custom version for the bundle (defaults to CLI tool version)
    #[arg(short, long)]
    version: Option<String>,
}

#[derive(serde::Serialize)]
struct FileEntry {
    path: String,
    size: u64,
    #[serde(with = "hash_serde")]
    hash: blake3::Hash,
    mime_type: Option<String>,
}

#[derive(serde::Serialize)]
struct Manifest {
    files: Vec<FileEntry>,
    version: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

mod hash_serde {
    use base64::{Engine, engine::general_purpose::STANDARD};
    use serde::Serializer;

    pub fn serialize<S>(hash: &blake3::Hash, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&STANDARD.encode(hash.as_bytes()))
    }
}

struct BundleBuilder {
    writer: ZipWriter<Cursor<Vec<u8>>>,
    files: Vec<FileEntry>,
}

impl BundleBuilder {
    fn new<P: AsRef<std::path::Path>>(input_path: P) -> Result<Self> {
        let input_path = input_path.as_ref();

        if !input_path.exists() {
            return Err(BundlerError::Config(format!(
                "Input path {} does not exist",
                input_path.display()
            )));
        }

        struct FileInfo {
            relative_path: String,
            content: Vec<u8>,
            hash: blake3::Hash,
            size: u64,
            mime_type: Option<String>,
        }

        let file_infos: Vec<FileInfo> = WalkDir::new(input_path)
            .into_iter()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().is_file())
            .par_bridge()
            .map(|entry| {
                let path = entry.path();
                let relative_path = path
                    .strip_prefix(input_path)
                    .unwrap()
                    .components()
                    .map(|comp| comp.as_os_str().to_string_lossy())
                    .collect::<Vec<_>>()
                    .join("/");

                let content = std::fs::read(path).map_err(|e| {
                    BundlerError::Config(format!("Failed to read file {}: {}", path.display(), e))
                })?;

                let hash = blake3::hash(&content);
                let size = content.len() as u64;

                let mime_type = mime_guess::from_path(path)
                    .first()
                    .map(|mime| mime.to_string());

                Ok(FileInfo {
                    relative_path,
                    content,
                    hash,
                    size,
                    mime_type,
                })
            })
            .collect::<Result<Vec<_>>>()?;

        let mut builder = Self {
            writer: ZipWriter::new(Cursor::new(Vec::new())),
            files: Vec::with_capacity(file_infos.len()),
        };

        for file_info in file_infos {
            let options = SimpleFileOptions::default().unix_permissions(0o644);

            builder
                .writer
                .start_file(&file_info.relative_path, options)
                .map_err(|e| BundlerError::Config(format!("Failed to start file in zip: {}", e)))?;

            builder
                .writer
                .write_all(&file_info.content)
                .map_err(|e| BundlerError::Config(format!("Failed to write file to zip: {}", e)))?;

            builder.files.push(FileEntry {
                path: file_info.relative_path,
                size: file_info.size,
                hash: file_info.hash,
                mime_type: file_info.mime_type,
            });
        }

        Ok(builder)
    }

    fn finish(self) -> Result<(Vec<u8>, Vec<FileEntry>)> {
        let writer = self
            .writer
            .finish()
            .map_err(|e| BundlerError::Config(format!("Failed to finish zip archive: {}", e)))?;

        Ok((writer.into_inner(), self.files))
    }
}

fn main() -> Result<()> {
    let args = Args::parse();

    if !args.input.exists() {
        return Err(BundlerError::InvalidPath(format!(
            "Input path does not exist: {}",
            args.input.display()
        )));
    }

    println!("Creating bundle from directory: {}", args.input.display());

    let builder = BundleBuilder::new(&args.input)?;
    let (content, files) = builder.finish()?;

    let version = args.version
        .or_else(|| std::env::var("WEBAPP_BUNDLE_VERSION").ok())
        .unwrap_or_else(|| env!("CARGO_PKG_VERSION").to_string());
    println!("Using bundle version: {}", version);

    let mut output_file = File::create(&args.output)?;
    output_file.write_all(&content)?;
    println!("Bundle written to: {}", args.output.display());

    let manifest = Manifest {
        files,
        version,
        created_at: chrono::Utc::now(),
    };

    if let Some(manifest_path) = args.manifest {
        let manifest_json = serde_json::to_string_pretty(&manifest)?;
        std::fs::write(manifest_path.clone(), manifest_json)?;
        println!("Manifest written to: {}", manifest_path.display());
    }

    println!(
        "Bundle created successfully with {} files",
        manifest.files.len()
    );

    Ok(())
}
