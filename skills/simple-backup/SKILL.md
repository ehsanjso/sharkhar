---
name: simple-backup
description: Backup agent brain (workspace) and body (state) to local folder and optionally sync to cloud via rclone.
metadata: {"clawdbot":{"emoji":"💾","requires":{"bins":["rclone","gpg","tar"]}}}
---

# Simple Backup

## When to Use
- Creating encrypted backups of the clawd workspace and state
- Scheduling periodic automated backups via cron
- Syncing backups to cloud storage (Google Drive, S3, etc.) via rclone
- Disaster recovery preparation for Pi or agent data

## When NOT to Use
- **Git-based version control** → Use `git commit/push` for code changes
- **Database backups** → Use database-specific tools (pg_dump, mongodump)
- **Partial/selective backups** → This backs up entire workspace and state
- **Real-time sync** → Use syncthing or rclone mount for continuous sync

A robust backup script that:
1.  **Stages:** Copies `~/clawd` (workspace), `~/.clawdbot` (state), and `skills/`.
2.  **Compresses:** Creates a `.tgz` archive.
3.  **Encrypts:** AES256 encryption using GPG (password required).
4.  **Prunes:** Rotates backups (Daily/Hourly retention).
5.  **Syncs:** Optionally pushes to a cloud provider via `rclone`.

## Setup

1.  **Dependencies:** Ensure `rclone` and `gpg` are installed (`brew install rclone gnupg`).
2.  **Password:** Set the encryption password:
    *   Env Var: `export BACKUP_PASSWORD="my-secret-password"`
    *   File: `~/.clawdbot/credentials/backup.key`
3.  **Cloud (Optional):** Configure an rclone remote:
    ```bash
    rclone config
    ```

## Usage

Run the backup:
```bash
simple-backup
```

## Configuration

You can override defaults with environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_ROOT` | `~/clawd/BACKUPS` | Local storage location |
| `REMOTE_DEST` | (empty) | Rclone path (e.g. `gdrive:backups`) |
| `MAX_DAYS` | 7 | Days to keep daily backups |
| `HOURLY_RETENTION_HOURS` | 24 | Hours to keep hourly backups |
