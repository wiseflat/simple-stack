/**
 * Terraform Helper
 * Wrapper around terraform CLI commands
 */
import { execSync } from 'child_process';

export class TerraformHelper {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  private exec(command: string): string {
    try {
      return execSync(command, { cwd: this.projectDir, encoding: 'utf-8' });
    } catch (error: any) {
      console.error(`Terraform command failed: ${command}`);
      throw error;
    }
  }

  init(): string {
    return this.exec('terraform init');
  }

  plan(): string {
    return this.exec('terraform plan -out=tfplan');
  }

  apply(): string {
    return this.exec('terraform apply tfplan');
  }

  destroy(): string {
    return this.exec('terraform destroy -auto-approve');
  }

  getTfstate(): string {
    return this.exec('terraform show -json tfstate');
  }

  getOutput(key: string): string {
    return this.exec(`terraform output -raw ${key}`);
  }
}
