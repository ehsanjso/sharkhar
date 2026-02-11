#!/bin/bash
# Bash completion for devlog.sh
# Source this file or add to ~/.bashrc

_devlog_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Options
    local opts="-s --section -d --dry-run -l --list -y --yesterday -D --date -e --edit -h --help"
    
    # Section suggestions after --section
    if [[ "$prev" == "-s" || "$prev" == "--section" ]]; then
        local sections="Debug Work Tasks Ideas Notes Research Build"
        COMPREPLY=($(compgen -W "$sections" -- "$cur"))
        return
    fi
    
    # Complete options if current word starts with -
    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$opts" -- "$cur"))
        return
    fi
}

complete -F _devlog_completions devlog
complete -F _devlog_completions devlog.sh
