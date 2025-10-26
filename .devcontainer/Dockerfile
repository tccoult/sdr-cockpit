# Dev container based on Alma Linux 9
FROM almalinux:9

# Install Node.js 20
RUN dnf install -y gcc-c++ make && \
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && \
    dnf install -y nodejs

# Install Python 3.11
RUN dnf install -y python3.11 python3.11-pip python3.11-devel

# Create symlinks for python and pip
RUN ln -sf /usr/bin/python3.11 /usr/local/bin/python && \
    ln -sf /usr/bin/pip3.11 /usr/local/bin/pip

# Install Docker CLI
RUN dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && \
    dnf install -y docker-ce-cli docker-compose-plugin

# Install git and common tools
RUN dnf install -y git curl wget vim

# Create a non-root user
RUN useradd -m -s /bin/bash node && \
    usermod -aG docker node || true

# Switch to non-root user
USER node
WORKDIR /workspace

# Set Python path
ENV PATH="/home/node/.local/bin:${PATH}"

CMD ["/bin/bash"]
