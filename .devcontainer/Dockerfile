# Dev container based on Alma Linux 9
FROM almalinux/9-base

# Install Node.js 20
RUN dnf install -y gcc-c++ make && \
    curl -fsSL https://rpm.nodesource.com/setup_25.x | bash - && \
    dnf install -y nodejs

# Install Python 3.11
RUN dnf install -y python3.11 python3.11-pip

# Create symlinks for python and pip
RUN ln -sf /usr/bin/python3.11 /usr/local/bin/python && \
    ln -sf /usr/bin/pip3.11 /usr/local/bin/pip

# Install git and common tools
RUN dnf install -y epel-release && \
    dnf install -y git git-lfs wget vim htop procps-ng util-linux tar less which zsh fzf

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# Oh My Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended && \
    sed -i 's/^plugins=(git)/plugins=(git fzf sudo colored-man-pages)/' ~/.zshrc

WORKDIR /workspace

CMD ["/bin/bash"]