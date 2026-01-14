function rtty --description "Rotate Linux TTY framebuffer (0/1/2/3 or 0/90/180/270). Default 270"
    set -l v 3
    if test (count $argv) -gt 0
        switch $argv[1]
            case 0 1 2 3
                set v $argv[1]
            case 90
                set v 1
            case 180
                set v 2
            case 270
                set v 3
            case '*'
                echo "usage: rtty [0|1|2|3|90|180|270]"
                return 1
        end
    end
    echo $v | sudo tee /sys/class/graphics/fbcon/rotate_all >/dev/null
end
