data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-kernel-6.1-arm64"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_iam_role" "ec2" {
  name = "${var.app_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecr_readonly" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.app_name}-${var.environment}-ec2-profile"
  role = aws_iam_role.ec2.name
}

resource "aws_security_group" "ec2" {
  name        = "${var.app_name}-${var.environment}-ec2-sg"
  description = "EC2 security group for ${var.app_name}"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.ssh_ingress_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.app_name}-${var.environment}-ec2-sg"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_instance" "app" {
  ami                         = data.aws_ami.al2023_arm64.id
  instance_type               = var.instance_type
  subnet_id                   = var.public_subnet_id
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  associate_public_ip_address = true
  key_name                    = var.ssh_key_name
  iam_instance_profile        = aws_iam_instance_profile.ec2.name

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    dnf update -y

    # Docker
    dnf install -y docker
    systemctl enable --now docker

    # Docker Compose plugin
    dnf install -y docker-compose-plugin

    # AWS CLI (for ECR login in deploy script)
    dnf install -y awscli

    # Nginx + Certbot
    dnf install -y nginx
    systemctl enable --now nginx

    dnf install -y certbot python3-certbot-nginx

    # App directory
    mkdir -p /opt/allrecords
    chown -R ec2-user:ec2-user /opt/allrecords

    echo "Bootstrap complete" > /opt/allrecords/BOOTSTRAP_OK
  EOF

  tags = {
    Name        = "${var.app_name}-${var.environment}-ec2"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name        = "${var.app_name}-${var.environment}-eip"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
