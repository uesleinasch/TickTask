#!/bin/bash

if type update-alternatives 2>/dev/null >&1; then
    # Remove previous link if it doesn't use update-alternatives
    if [ -L '/usr/bin/${executable}' -a -e '/usr/bin/${executable}' -a "`readlink '/usr/bin/${executable}'`" != '/etc/alternatives/${executable}' ]; then
        rm -f '/usr/bin/${executable}'
    fi
    update-alternatives --install '/usr/bin/${executable}' '${executable}' '/opt/${sanitizedProductName}/${executable}' 100 || ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
else
    ln -sf '/opt/${sanitizedProductName}/${executable}' '/usr/bin/${executable}'
fi

# Ubuntu 24.04+ (kernel.apparmor_restrict_unprivileged_userns=1) only lets a process create user
# namespaces if an AppArmor profile grants `userns`. The test below runs as root, which the
# restriction does not apply to, so on its own it would wrongly conclude that the namespace
# sandbox works and drop the SUID bit — and the app aborts at launch for every normal user.
# The profile restores the namespace sandbox; SUID stays as the fallback if it can't be loaded.
APPARMOR_PROFILE='/etc/apparmor.d/${executable}'
SANDBOX_OK=0

if [ -d /etc/apparmor.d ] && hash apparmor_parser 2>/dev/null; then
    cat > "$APPARMOR_PROFILE" <<'EOF'
# Unconfined profile that only exists to grant user namespaces to the Chromium sandbox.
abi <abi/4.0>,
include <tunables/global>

profile ${executable} "/opt/${sanitizedProductName}/${executable}" flags=(unconfined) {
  userns,

  include if exists <local/${executable}>
}
EOF
    if apparmor_parser --replace --write-cache --skip-read-cache "$APPARMOR_PROFILE" 2>/dev/null; then
        SANDBOX_OK=1
    else
        rm -f "$APPARMOR_PROFILE"
    fi
fi

if [ "$SANDBOX_OK" = 0 ] && [ "`sysctl -n kernel.apparmor_restrict_unprivileged_userns 2>/dev/null`" != "1" ] && [[ -L /proc/self/ns/user ]] && unshare --user true 2>/dev/null; then
    SANDBOX_OK=1
fi

if [ "$SANDBOX_OK" = 1 ]; then
    chmod 0755 '/opt/${sanitizedProductName}/chrome-sandbox' || true
else
    # Use SUID chrome-sandbox only on systems without usable user namespaces
    chmod 4755 '/opt/${sanitizedProductName}/chrome-sandbox' || true
fi

if hash update-mime-database 2>/dev/null; then
    update-mime-database /usr/share/mime || true
fi

if hash update-desktop-database 2>/dev/null; then
    update-desktop-database /usr/share/applications || true
fi
