# ODK Central CDK Deployment

This repository contains an AWS CDK stack to deploy a **minimal instance of [ODK Central](https://docs.getodk.org/central-install/)** on a single EC2 instance.

The stack provisions:

- A public EC2 instance running Ubuntu with Docker and Docker Compose
- Automatic installation and launch of ODK Central
- Route 53 DNS record pointing to the instance
- ACM certificate for HTTPS
- Optional environment variable injection from AWS Secrets Manager
- Configurable disk size and AMI

Once the stack is running, you can access ODK Central via the provided domain name.
You'll also need to connect to the instance via one of the AWS connection methods (SSH, SSM, etc.) to complete the setup.
Follow the ODK Central guide on [setting up users](https://docs.getodk.org/central-install-digital-ocean/#logging-into-central) to set up an admin user.

---

## 📦 Prerequisites

- Node.js (>= 16)
- AWS CDK v2
- AWS CLI with appropriate credentials (or use `--profile`)
- A Route 53 public hosted zone
- An EC2 key pair (to SSH in if needed)

---

## 🛠 Configuration

Edit your `cdk.json` file to set the deployment context:

```json
{
  "context": {
    "domainName": "oxrse.uk",
    "fullDomainName": "odk-central-test.oxrse.uk",
    "secretName": "odk-central/env-vars",
    "keyName": "your-keypair-name",
    "instanceVolumeSize": 30,
    "ubuntuAmiId": "ami-079b5e5b29763ec7c"
  }
}
````

| Key                  | Description                                                                   |
| -------------------- | ----------------------------------------------------------------------------- |
| `domainName`         | Root domain (must exist in Route 53)                                          |
| `fullDomainName`     | Fully-qualified domain name (used in DNS and SSL cert)                        |
| `secretName`         | (Optional) Name of an AWS Secrets Manager secret with env vars (JSON format)  |
| `keyName`            | Name of your existing EC2 key pair                                            |
| `instanceVolumeSize` | Root volume size in GB                                                        |
| `ubuntuAmiId`        | AMI ID for a basic Ubuntu image (no LVM), recommended for clean disk resizing |

---

## 🚀 Deploy

```bash
cdk deploy --profile your-aws-profile
```

This will:

1. Lookup your Route 53 zone
2. Launch a t3.micro EC2 instance
3. Install Docker, Docker Compose, and ODK Central
4. Configure HTTPS via ACM
5. Inject environment variables from Secrets Manager (if configured)
6. Set up a DNS A record pointing your FQDN to the instance

---

## 🔐 Secrets Format

If you use the `secretName` context key, the secret's value should be a **JSON object** of key-value pairs. For example:

```json
{
  "DOMAIN": "odk-central-test.oxrse.uk",
  "EMAIL": "admin@example.com",
  "SSL_TYPE": "letsencrypt"
}
```

These will be made available to the instance as shell environment variables and appended to ODK Central’s `.env`.

---

## 🧼 Cleanup

To destroy all provisioned resources:

```bash
cdk destroy --profile your-aws-profile
```

---

## 📝 Notes

* This deployment is **not hardened for production** — it’s suitable for short-term testing and evaluation.
* The EC2 instance is assigned a public IP and open security group (ports 22, 80, 443).
* No NAT Gateway or private subnets are used — it’s a flat public deployment.

---

## 📎 License

MIT — © University of Oxford, 2025
