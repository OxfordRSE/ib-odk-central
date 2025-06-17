import {Stack, StackProps, Duration, CfnOutput, Tags} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  Instance,
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  AmazonLinuxGeneration,
  SecurityGroup,
  Peer,
  Port,
  UserData,
  SubnetType,
  BlockDeviceVolume, EbsDeviceVolumeType
} from 'aws-cdk-lib/aws-ec2';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import {Secret} from "aws-cdk-lib/aws-secretsmanager";

export class OdkCentralStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Retrieve the domain name from context
    const domain = this.node.getContext('domainName');
    const fqdn = `${this.node.getContext('subdomain')}.${domain}`;

    const secretName = this.node.getContext('odkSecretName');

    // Create a VPC
    const vpc = new Vpc(this, 'OdkVpc', {maxAzs: 1, natGateways: 0});

    // Lookup the hosted zone
    const hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domain,
    });

    // Create an ACM certificate
    const certificate = new Certificate(this, 'Certificate', {
      domainName: fqdn,
      validation: CertificateValidation.fromDns(hostedZone),
    });

    // Security group for the EC2 instance
    const securityGroup = new SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'Allow SSH, HTTP, and HTTPS',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22), 'Allow SSH');
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Allow HTTP');
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'Allow HTTPS');

    // User data script to install Docker, Docker Compose, and ODK Central
    const userData = UserData.forLinux();
    userData.addCommands(
      'echo "Starting ODK Central setup" | tee /var/log/odk-setup.log',
      'exec > >(tee -a /var/log/odk-setup.log) 2>&1',

      // Update and install dependencies
      `echo "Add Docker's official GPG key"`,
      'sudo apt-get update',
      'sudo apt-get install ca-certificates curl',
      'sudo install -m 0755 -d /etc/apt/keyrings',
      'sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc',
      'sudo chmod a+r /etc/apt/keyrings/docker.asc',
      `echo "Setting up Docker repository"`,
      `echo \\
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \\
        $(. /etc/os-release && echo "\${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \\
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null`,
      'sudo apt-get update',
      'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      'sudo docker run hello-world',
      // Clone ODK Central
      `echo "Cloning ODK Central repository"`,
      'sudo apt-get install -y git',
      'git clone https://github.com/getodk/central.git',
      'cd central',
      'sudo git submodule update -i',
      'sudo git checkout v2025.1.4',
      'sudo touch files/allow-postgres14-upgrade',

      `echo "Setting up environment variables from AWS Secrets Manager ${secretName}"`,
      'sudo apt-get install -y unzip jq',
      'curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"',
      'unzip awscliv2.zip',
      'sudo ./aws/install',
      // Set AWS region explicitly if needed
      `export AWS_REGION=${this.region}`,
      // Fetch the secret content
      `aws secretsmanager get-secret-value --secret-id ${secretName} --query SecretString --output text > /tmp/odk-secret.json`,
      // Export each key as an env var for the session (optional: persist to profile)
      'sudo touch .env',
      'sudo chmod 777 .env',
      `echo 'Executing jq -r "to_entries|map(\\"export \\(.key)=\\(.value)\\")|.[]"'`,
      `sudo cat /tmp/odk-secret.json | jq -r "to_entries|map(\\"\\(.key)=\\(.value)\\")|.[]" >> .env`,
      `echo 'DOMAIN=${fqdn}' >> .env`,
      `echo 'SYSADMIN_EMAIL=matt.jaquiery@dtc.ox.ac.uk' >> .env`,
      'sudo chmod 644 .env',

      // Start ODK Central
      `echo "Running ODK Central"`,
      'sudo docker compose build',
      'sudo docker compose up -d'
    );

    // EC2 instance
    const instance = new Instance(this, 'Instance2', {
      vpc,
      instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.LARGE),
      machineImage: MachineImage.genericLinux({
        'eu-west-2': 'ami-044415bb13eee2391'
      }),
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: BlockDeviceVolume.ebs(30, {
            deleteOnTermination: true,
            encrypted: true,
            volumeType: EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      securityGroup,
      userData,
      associatePublicIpAddress: true,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    // Create a DNS A record for the EC2 instance
    new ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      recordName: scope.node.getContext("subdomain"),
      target: RecordTarget.fromIpAddresses(instance.instancePublicIp),
    });

    // Grant the instance role read access to the secret
    const secret = Secret.fromSecretNameV2(this, 'OdkSecret', secretName);
    secret.grantRead(instance.role);

    // Output the public IP and domain name
    new CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
    });

    new CfnOutput(this, 'URL', {
      value: `https://${fqdn}`,
    });

    Tags.of(scope).add('project-name', scope.node.tryGetContext('projectName') ?? 'odk-central');
  }
}
