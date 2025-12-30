Name:           sdr-cockpit
Version:        %{?_version}%{!?_version:0.1.0}
Release:        %{?_release}%{!?_release:1}%{?dist}
Summary:        SDR Cockpit Web Application

License:        TBD
URL:            https://github.com/tccoult/sdr-cockpit
Source0:        sdr-cockpit-image.tar
Source1:        sdr-cockpit.service

# Container images are architecture-specific
# Override via --define "_target_arch x86_64" (or aarch64)
# When not specified, builds as noarch (legacy behavior)
BuildArch:      %{?_target_arch}%{!?_target_arch:noarch}

Requires:       podman >= 3.0
Requires:       redis >= 6.0
Requires(post): systemd
Requires(preun): systemd
Requires(postun): systemd

%description
SDR Cockpit provides a modern web interface for controlling and monitoring
Software Defined Radio (SDR) systems with real-time visualizations and
multi-user support. This package contains the containerized application
for air-gapped deployment.

Note: This package contains architecture-specific container images. Ensure
you install the package matching your system architecture (x86_64 or aarch64).

%prep
# No prep needed - sources are already in the right format

%build
# No build needed - container image is pre-built

%install
# Create directories
install -d %{buildroot}%{_datadir}/sdr-cockpit
install -d %{buildroot}%{_unitdir}

# Install container image
install -m 644 %{SOURCE0} %{buildroot}%{_datadir}/sdr-cockpit/sdr-cockpit-image.tar

# Install systemd service (modified for RPM install)
install -m 644 %{SOURCE1} %{buildroot}%{_unitdir}/sdr-cockpit.service

%post
# Load container image
echo "Loading SDR Cockpit container image..."
podman load -i %{_datadir}/sdr-cockpit/sdr-cockpit-image.tar

# Tag the image appropriately
podman tag localhost/sdr-cockpit:latest sdr-cockpit:latest

# Reload systemd
%systemd_post sdr-cockpit.service

echo "SDR Cockpit installed successfully!"
echo "Start the service: sudo systemctl start sdr-cockpit"
echo "Enable at boot: sudo systemctl enable sdr-cockpit"
echo "Access at: http://localhost:8000"

%preun
%systemd_preun sdr-cockpit.service

%postun
%systemd_postun_with_restart sdr-cockpit.service

# Remove container image on full uninstall
if [ $1 -eq 0 ]; then
    podman rmi sdr-cockpit:latest 2>/dev/null || true
fi

%files
%{_datadir}/sdr-cockpit/sdr-cockpit-image.tar
%{_unitdir}/sdr-cockpit.service

%changelog
* Sun Oct 26 2025 SDR Cockpit Team
- Initial RPM package for air-gapped deployment
