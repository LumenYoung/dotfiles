function paper2md
    # Select PDF via fzf from Zotero directory
    set -l pdf_file (fd -e pdf . ~/Zotero | fzf --height 40%)
    if test -z "$pdf_file"
        echo "No file selected"
        return
    end

    # Create temporary output directory
    set -l tmp_output "/tmp/md"
    mkdir -p $tmp_output

    # Generate base name for output files
    set -l base_name (basename $pdf_file .pdf | string replace -r " \\d{4}- " " ")

    # Process with marker_single
    marker_single "$pdf_file" --output_dir $tmp_output

    # Move the markdown file to Zotero papermd
    set -l md_output "$HOME/Zotero/papermd"
    mkdir -p $md_output
    
    if test -e "$tmp_output/$base_name/$base_name.md"
        mv -v "$tmp_output/$base_name/$base_name.md" "$md_output/"
        mv -v "$tmp_output/$base_name/{$base_name}_meta.json" "$md_output/"
        echo "Files moved to $md_output"
        rm -rf "$tmp_output/$base_name"

        if functions -q paper-upload
            paper-upload
        else
            echo "paper-upload function not found"
        end
    else
        echo "Conversion failed - no markdown file found"
    end
end
