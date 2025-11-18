function source-env --description 'Source environment files (Fish or bash syntax)'
    # Show usage if no arguments
    if test (count $argv) -eq 0
        echo "Usage: source-env <file>..."
        return 1
    end
    
    for file in $argv
        # Validate file exists
        if not test -f $file
            echo "source-env: $file not found" >&2
            continue
        end
        
        # Auto-detect format: check if file contains Fish 'set' commands
        if string match -q '*set -g*' (head -n 3 $file 2>/dev/null)
            # Source Fish-syntax file directly
            source $file 2>/dev/null
            and echo "✓ Sourced Fish env: $file"
            or echo "✗ Failed: $file" >&2
        else
            # Parse bash-style KEY=value format
            set -l var_count 0
            while read -l line
                # Skip comments and empty lines
                string match -qr '^\s*(#.*)?$' "$line"; and continue
                
                # Split on first '='
                set -l kv (string split -m 1 = $line)
                
                if test (count $kv) -eq 2
                    set -gx $kv[1] $kv[2]
                    set var_count (math $var_count + 1)
                else
                    echo "✗ Invalid line in $file: $line" >&2
                end
            end < $file
            
            test $var_count -gt 0; and echo "✓ Sourced $var_count var(s) from: $file"
        end
    end
end
