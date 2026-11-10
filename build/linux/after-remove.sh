#!/bin/bash

# Delete the link to the binary
if type update-alternatives >/dev/null 2>&1; then
    update-alternatives --remove '${executable}' '/usr/bin/${executable}'
else
    rm -f '/usr/bin/${executable}'
fi

# Upgrades also run this script; only drop the AppArmor profile when the package really goes away.
if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    if [ -f '/etc/apparmor.d/${executable}' ]; then
        if hash apparmor_parser 2>/dev/null; then
            apparmor_parser --remove '/etc/apparmor.d/${executable}' 2>/dev/null || true
        fi
        rm -f '/etc/apparmor.d/${executable}'
    fi
fi
