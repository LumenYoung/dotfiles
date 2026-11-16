function pi --description 'pi coding agent; loads TextFold when TEXTFOLD_PI_ENABLE=1'
    if test "$TEXTFOLD_PI_ENABLE" = 1
        command pi -e git:github.com/chenxiachan/textfold $argv
    else
        command pi $argv
    end
end
