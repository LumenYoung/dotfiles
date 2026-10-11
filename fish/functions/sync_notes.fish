function sync_notes --description 'Synchronize markdown files from source to destination directory with git auto-commit'
    __sync_notes_validate_args $argv; or return 1
    __sync_notes_setup_directories $argv[1] $argv[2]; or return 1

    # Initialize git debounce variables (in seconds since epoch)
    set -g LAST_CHANGE_TIME 0
    set -g GIT_DEBOUNCE_INTERVAL 300 # 5 minutes in seconds

    __sync_notes_perform_initial_sync; or return 1
    __sync_notes_start_polling_loop
end

function __sync_notes_validate_args
    if test (count $argv) -lt 2
        echo "Usage: sync_notes <source_dir> <dest_dir>"
        return 1
    end
end

function __sync_notes_setup_directories
    set -g SOURCE_DIR $argv[1]
    set -g DEST_DIR $argv[2]
    
    # Ensure directories end with /
    if not string match -q "*/" $SOURCE_DIR
        set -g SOURCE_DIR "$SOURCE_DIR/"
    end
    if not string match -q "*/" $DEST_DIR
        set -g DEST_DIR "$DEST_DIR/"
    end
    
    # Validate source directory exists
    if not test -d $SOURCE_DIR
        echo "Error: Source directory '$SOURCE_DIR' does not exist"
        return 1
    end
    
    # Create destination directory if it doesn't exist
    mkdir -p $DEST_DIR

    # Keep synchronization state outside /tmp, where age-based cleanup can
    # silently remove the change marker from a long-running service.
    set -l state_home "$HOME/.local/state"
    if set -q XDG_STATE_HOME; and test -n "$XDG_STATE_HOME"
        set state_home "$XDG_STATE_HOME"
    end
    set -g SYNC_NOTES_STATE_DIR "$state_home/notes-sync"
    set -g SYNC_NOTES_TIMESTAMP "$SYNC_NOTES_STATE_DIR/last-successful-scan"
    mkdir -p "$SYNC_NOTES_STATE_DIR"; or begin
        echo "Error: Could not create sync state directory '$SYNC_NOTES_STATE_DIR'"
        return 1
    end
    
    # Determine git repo root (parent of content directory)
    set -g GIT_ROOT (dirname $DEST_DIR)
    
    # Validate git repo
    if not test -d "$GIT_ROOT/.git"
        echo "Warning: '$GIT_ROOT' is not a git repository"
        set -g GIT_ENABLED false
    else
        set -g GIT_ENABLED true
        echo "Git repository detected at: $GIT_ROOT"
    end
end

function __sync_notes_perform_initial_sync
    echo "Starting sync from '$SOURCE_DIR' to '$DEST_DIR'"
    echo "Performing initial sync..."

    # Capture the scan boundary before examining the source. Changes made after
    # this point remain newer than the promoted marker and are handled by the
    # next polling cycle.
    __sync_notes_prepare_scan_cutoff; or return 1

    # If the service was restarted, close embeds for files changed since the
    # previous successful scan. A missing marker deliberately selects all
    # publish files so lost state causes reconciliation rather than a stall.
    __sync_notes_collect_changed_files
    __sync_notes_publish_embed_closure
    
    rsync -av --delete --exclude=".well-known/***" --include="*.md" --include="*.png" --include="*.jpg" --include="*.jpeg" --include="*.gif" --include="*.webp" --include="*.svg" --include="*.pdf" --include="*/" --exclude="*" "$SOURCE_DIR" "$DEST_DIR"
    set -l sync_status $status
    
    if test $sync_status -eq 0
        __sync_notes_promote_scan_cutoff; or return 1
        echo "Initial sync completed successfully"
    else
        __sync_notes_discard_scan_cutoff
        echo "Initial sync failed with status: $sync_status"
        return 1
    end

    # After initial sync, check for changes to arm the git commit debounce
    if test "$GIT_ENABLED" = "true"
        pushd "$GIT_ROOT" >/dev/null
        set GIT_STATUS (git status --porcelain)
        if test -n "$GIT_STATUS"
            echo "Changes detected after initial sync. Arming git commit."
            set -g LAST_CHANGE_TIME (date +%s)
        end
        popd >/dev/null
    end
end

function __sync_notes_start_polling_loop
    echo "Starting polling watcher (checking every 5 seconds)..."
    
    # Polling loop
    while true
        sleep 5

        __sync_notes_prepare_scan_cutoff; or continue
        if __sync_notes_check_for_changes
            __sync_notes_perform_sync; or continue
        else
            __sync_notes_discard_scan_cutoff
        end
        
        # Always check for git operations, regardless of new changes
        __sync_notes_handle_git_operations
    end
end

function __sync_notes_check_for_changes
    # Check if source directory has been modified recently. Missing state forces
    # a full reconciliation, including when the source currently has no files.
    __sync_notes_collect_changed_files
    if test "$SYNC_NOTES_MARKER_MISSING" = "true"
        return 0
    end
    test (count $SYNC_NOTES_CHANGED_FILES) -gt 0; or test (count $SYNC_NOTES_CHANGED_DIRECTORIES) -gt 0
end

function __sync_notes_collect_changed_files
    set -g SYNC_NOTES_MARKER_MISSING false

    if not test -e "$SYNC_NOTES_TIMESTAMP"
        echo "Change marker missing; scheduling full reconciliation."
        set -g SYNC_NOTES_MARKER_MISSING true
        set -g SYNC_NOTES_CHANGED_FILES (find "$SOURCE_DIR" -type f \( -name "*.md" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" -o -name "*.svg" -o -name "*.pdf" \) 2>/dev/null)
        set -g SYNC_NOTES_CHANGED_DIRECTORIES (find "$SOURCE_DIR" -type d 2>/dev/null)
        set -g SYNC_NOTES_CHANGED_MARKDOWN_FILES (find "$SOURCE_DIR" -type f -name "*.md" 2>/dev/null)
        return 0
    end

    set -g SYNC_NOTES_CHANGED_FILES (find "$SOURCE_DIR" -type f \( -name "*.md" -o -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" -o -name "*.webp" -o -name "*.svg" -o -name "*.pdf" \) -newer "$SYNC_NOTES_TIMESTAMP" 2>/dev/null)
    set -g SYNC_NOTES_CHANGED_DIRECTORIES (find "$SOURCE_DIR" -type d -newer "$SYNC_NOTES_TIMESTAMP" 2>/dev/null)

    # Moving an old file preserves its file mtime, while creating, moving, or
    # deleting a directory entry updates the parent directory mtime. On a
    # structural change, inspect all publish Markdown so moved notes still get
    # embed-closure handling before rsync reconciles additions and deletions.
    if test (count $SYNC_NOTES_CHANGED_DIRECTORIES) -gt 0
        set -g SYNC_NOTES_CHANGED_MARKDOWN_FILES (find "$SOURCE_DIR" -type f -name "*.md" 2>/dev/null)
    else
        set -g SYNC_NOTES_CHANGED_MARKDOWN_FILES (find "$SOURCE_DIR" -type f -name "*.md" -newer "$SYNC_NOTES_TIMESTAMP" 2>/dev/null)
    end
end

function __sync_notes_prepare_scan_cutoff
    __sync_notes_discard_scan_cutoff
    set -g SYNC_NOTES_SCAN_CUTOFF (mktemp "$SYNC_NOTES_STATE_DIR/scan-cutoff.XXXXXX")
    if test $status -ne 0; or test -z "$SYNC_NOTES_SCAN_CUTOFF"
        echo "Error: Could not create scan cutoff in '$SYNC_NOTES_STATE_DIR'"
        set -e SYNC_NOTES_SCAN_CUTOFF
        return 1
    end
end

function __sync_notes_promote_scan_cutoff
    if not set -q SYNC_NOTES_SCAN_CUTOFF; or not test -e "$SYNC_NOTES_SCAN_CUTOFF"
        echo "Error: Scan cutoff is missing; refusing to advance sync state"
        return 1
    end

    mv -f -- "$SYNC_NOTES_SCAN_CUTOFF" "$SYNC_NOTES_TIMESTAMP"; or begin
        echo "Error: Could not update sync marker '$SYNC_NOTES_TIMESTAMP'"
        return 1
    end
    set -e SYNC_NOTES_SCAN_CUTOFF
end

function __sync_notes_discard_scan_cutoff
    if set -q SYNC_NOTES_SCAN_CUTOFF; and test -n "$SYNC_NOTES_SCAN_CUTOFF"
        rm -f -- "$SYNC_NOTES_SCAN_CUTOFF"
    end
    set -e SYNC_NOTES_SCAN_CUTOFF
end

function __sync_notes_perform_sync
    # Resolve publish embeds before rsync so newly moved assets/notes are included.
    __sync_notes_publish_embed_closure

    echo "Changes detected, syncing..."
    
    rsync -av --delete --exclude=".well-known/***" --include="*.md" --include="*.png" --include="*.jpg" --include="*.jpeg" --include="*.gif" --include="*.webp" --include="*.svg" --include="*.pdf" --include="*/" --exclude="*" "$SOURCE_DIR" "$DEST_DIR"
    set -l sync_status $status
    
    if test $sync_status -eq 0
        __sync_notes_promote_scan_cutoff; or return 1
        set -g LAST_CHANGE_TIME (date +%s)
        echo "Sync completed successfully"
        if test "$GIT_ENABLED" = "true"
            set DEBOUNCE_MINUTES (math $GIT_DEBOUNCE_INTERVAL / 60)
            echo "Git commit will occur in $DEBOUNCE_MINUTES minutes if no further changes are made."
        end
    else
        __sync_notes_discard_scan_cutoff
        echo "Sync failed (status: $sync_status)"
        return 1
    end
end

function __sync_notes_publish_embed_closure
    if test (count $SYNC_NOTES_CHANGED_MARKDOWN_FILES) -eq 0
        return 0
    end

    set PUBLISH_DIR (string replace -r '/$' '' -- "$SOURCE_DIR")
    set SPACE_ROOT (dirname "$PUBLISH_DIR")
    set CLOSURE_SCRIPT "$HOME/dotfiles/scripts/publish-embed-closure"

    if not test -x "$CLOSURE_SCRIPT"
        echo "Warning: publish embed closure script not executable: $CLOSURE_SCRIPT"
        return 0
    end

    echo "Resolving embedded publish closure..."
    "$CLOSURE_SCRIPT" --space-root "$SPACE_ROOT" --publish-dir "$PUBLISH_DIR" $SYNC_NOTES_CHANGED_MARKDOWN_FILES
    if test $status -ne 0
        echo "Warning: publish embed closure failed; continuing with rsync"
    end
end

function __sync_notes_handle_git_operations
    # Git operations (if enabled and enough time has passed)
    if test "$GIT_ENABLED" = "true"
        if __sync_notes_should_run_git_operation
            __sync_notes_git_commit_and_push
        end
    end
end

function __sync_notes_should_run_git_operation
    # Only run git operation if no changes have occurred for the debounce period
    if test $LAST_CHANGE_TIME -eq 0
        return 1  # No changes have occurred yet
    end
    
    set CURRENT_TIME (date +%s)
    set TIME_SINCE_LAST_CHANGE (math $CURRENT_TIME - $LAST_CHANGE_TIME)
    test $TIME_SINCE_LAST_CHANGE -ge $GIT_DEBOUNCE_INTERVAL
end

function __sync_notes_git_commit_and_push
    echo "Checking for git changes..."
    
    # Change to git repo directory
    pushd "$GIT_ROOT" >/dev/null
    
    # Check if there are any changes (including untracked files)
    set GIT_STATUS (git status --porcelain)
    if test -z "$GIT_STATUS"
        echo "No git changes detected"
        # Reset change time even when no changes are found
        set -g LAST_CHANGE_TIME 0
    else
        set COMMIT_DATE (date '+%Y-%m-%d %H:%M:%S')
        set COMMIT_MSG "note: automatic commit at $COMMIT_DATE"
        
        echo "Committing changes to git..."
        git add .
        git commit -m "$COMMIT_MSG"
        
        if test $status -eq 0
            echo "Git commit successful"
            # Reset change time after successful commit
            set -g LAST_CHANGE_TIME 0
            
            echo "Pushing to remote..."
            git push
            
            if test $status -eq 0
                echo "Git push successful"
            else
                echo "Git push failed (status: $status)"
            end
        else
            echo "Git commit failed (status: $status)"
        end
    end
    
    # Return to previous directory
    popd >/dev/null
end
