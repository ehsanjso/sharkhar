---
name: process-watch
description: Monitor system processes - CPU, memory, disk I/O, network, open files, ports. Find resource hogs, kill runaway processes, track what's consuming your machine.
metadata:
  clawdhub:
    emoji: "📊"
    requires:
      bins: ["python3"]
---

# Process Watch

Comprehensive system process monitoring. Goes beyond basic `top` to show:
- CPU & memory usage
- Disk I/O per process
- Network connections
- Open files & handles
- Port bindings
- Process trees

## Commands

### List processes
```bash
process-watch list [--sort cpu|mem|disk|name] [--limit 20]
```

### Top resource consumers
```bash
process-watch top [--type cpu|mem|disk|net] [--limit 10]
```

### Process details
```bash
process-watch info <pid>
# Shows: CPU, memory, open files, network connections, children, environment
```

### Find by name
```bash
process-watch find <name>
# e.g., process-watch find chrome
```

### Port bindings
```bash
process-watch ports [--port 3000]
# What's listening on which port?
```

### Network connections
```bash
process-watch net [--pid <pid>] [--established]
```

### Kill process
```bash
process-watch kill <pid> [--force]
process-watch kill --name "chrome" [--force]
```

### Watch mode
```bash
process-watch watch [--interval 2] [--alert-cpu 80] [--alert-mem 90]
# Continuous monitoring with threshold alerts
```

### System summary
```bash
process-watch summary
# Quick overview: load, memory, disk, top processes
```

## Examples

```bash
# What's eating my CPU?
process-watch top --type cpu

# What's on port 3000?
process-watch ports --port 3000

# Details on a specific process
process-watch info 1234

# Kill all Chrome processes
process-watch kill --name chrome

# Watch with alerts
process-watch watch --alert-cpu 90 --alert-mem 85
```

## Platform Support

- **macOS**: Full support
- **Linux**: Full support  
- **Windows**: Partial (basic process list, no lsof equivalent)

## When to Use

- Finding which process is consuming CPU/memory/disk
- Investigating what's listening on a specific port
- Killing runaway or stuck processes
- Monitoring system resource usage in real-time
- Debugging why a system is slow or unresponsive
- Listing network connections for a process
- Finding open files or handles for a process

## When NOT to Use

- **Smart home control** → Use `homeassistant` instead
- **Service management** (start/stop/restart services) → Use `pi-admin` or `systemctl`
- **Package updates** → Use `pi-admin` for apt/system updates
- **Tool recommendations** ("what CLI should I use?") → Use `sysadmin-toolbox` for tool discovery
- **Shell scripting help** → Use `sysadmin-toolbox` for one-liner references
- **Docker/container inspection** → Use Docker CLI or `sysadmin-toolbox` container tools
- **General system info** (hostname, kernel, uptime) → Use `pi-admin` for system overview
