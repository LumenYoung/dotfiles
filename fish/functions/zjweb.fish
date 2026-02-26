function zjweb --description "Run zellij web with enforced web config"
  set -l config_home "$HOME/.config"
  if set -q XDG_CONFIG_HOME
    if test -n "$XDG_CONFIG_HOME"
      set config_home "$XDG_CONFIG_HOME"
    end
  end

  set -l web_cfg "$config_home/zellij/config.web.kdl"
  if not test -f "$web_cfg"
    echo "[zjweb] missing config: $web_cfg" >&2
    return 1
  end

  command zellij --config "$web_cfg" web $argv
end
