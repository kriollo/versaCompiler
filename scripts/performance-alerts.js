import { promises as fs } from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';

export interface RegressionAlert {
  testName: string;
  currentTime: number;
  previousTime: number;
  changePercentage: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  environment: {
    nodeVersion: string;
    platform: string;
    ci: boolean;
  };
}

export interface PerformanceThresholds {
  warning: number;    // 10% slower
  critical: number;   // 30% slower
  failure: number;    // 50% slower
}

export class PerformanceAlertSystem {
  private thresholds: PerformanceThresholds = {
    warning: 10,
    critical: 30,
    failure: 50
  };

  private emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  private webhookUrl = process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL;

  /**
   * Analiza los resultados de performance y detecta regresiones
   */
  async analyzeResults(historyPath: string): Promise<RegressionAlert[]> {
    try {
      const history = JSON.parse(await fs.readFile(historyPath, 'utf8'));

      if (history.length < 2) {
        console.log('📊 No hay suficiente historial para comparar');
        return [];
      }

      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      const alerts: RegressionAlert[] = [];

      for (const [testName, currentResult] of Object.entries(latest.results)) {
        const prevResult = previous.results[testName];

        if (!prevResult) continue;

        const currentTime = this.parseTimeMs(currentResult.avgTime);
        const previousTime = this.parseTimeMs(prevResult.avgTime);
        const changePercentage = ((currentTime - previousTime) / previousTime) * 100;

        if (changePercentage > this.thresholds.warning) {
          const severity = this.getSeverity(changePercentage);

          alerts.push({
            testName,
            currentTime,
            previousTime,
            changePercentage,
            severity,
            timestamp: latest.timestamp,
            environment: {
              nodeVersion: process.version,
              platform: process.platform,
              ci: !!process.env.CI
            }
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('❌ Error analyzing performance results:', error);
      return [];
    }
  }

  /**
   * Envía alertas de regresión por múltiples canales
   */
  async sendAlerts(alerts: RegressionAlert[]): Promise<void> {
    if (alerts.length === 0) {
      console.log('✅ No se detectaron regresiones significativas');
      return;
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');

    console.log(`🚨 Se detectaron ${alerts.length} regresiones (${criticalAlerts.length} críticas)`);

    // Enviar por email si hay regresiones críticas
    if (criticalAlerts.length > 0 && this.emailConfig.auth.user) {
      await this.sendEmailAlert(criticalAlerts);
    }

    // Enviar webhook si está configurado
    if (this.webhookUrl && criticalAlerts.length > 0) {
      await this.sendWebhookAlert(criticalAlerts);
    }

    // Generar reporte local
    await this.generateRegressionReport(alerts);

    // En CI, fallar el build si hay regresiones críticas
    if (process.env.CI && criticalAlerts.length > 0) {
      console.error('💥 CRITICAL REGRESSIONS DETECTED - FAILING BUILD');
      process.exit(1);
    }
  }

  /**
   * Envía alerta por email
   */
  private async sendEmailAlert(alerts: RegressionAlert[]): Promise<void> {
    try {
      const transporter = nodemailer.createTransporter(this.emailConfig);

      const subject = `🚨 VersaCompiler Performance Regression Alert - ${alerts.length} Issues`;
      const html = this.generateEmailHTML(alerts);

      await transporter.sendMail({
        from: this.emailConfig.auth.user,
        to: process.env.ALERT_EMAIL || this.emailConfig.auth.user,
        subject,
        html
      });

      console.log('📧 Email alert sent successfully');
    } catch (error) {
      console.error('❌ Failed to send email alert:', error.message);
    }
  }

  /**
   * Envía alerta por webhook (Slack/Discord)
   */
  private async sendWebhookAlert(alerts: RegressionAlert[]): Promise<void> {
    try {
      const payload = this.generateWebhookPayload(alerts);

      const response = await fetch(this.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('📱 Webhook alert sent successfully');
      } else {
        console.error('❌ Failed to send webhook alert:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error sending webhook alert:', error.message);
    }
  }

  /**
   * Genera reporte de regresiones en archivo local
   */
  private async generateRegressionReport(alerts: RegressionAlert[]): Promise<void> {
    const reportPath = path.join(process.cwd(), 'performance-results', 'regression-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      alerts,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        ci: !!process.env.CI,
        commit: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown'
      }
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Regression report saved: ${reportPath}`);
  }

  /**
   * Genera HTML para email
   */
  private generateEmailHTML(alerts: RegressionAlert[]): string {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;

    return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .header { background: #ff4444; color: white; padding: 20px; border-radius: 5px; }
          .alert { margin: 10px 0; padding: 15px; border-left: 4px solid #ff4444; background: #fff5f5; }
          .critical { border-left-color: #ff0000; background: #fff0f0; }
          .high { border-left-color: #ff6600; background: #fff8f0; }
          .medium { border-left-color: #ffaa00; background: #fffcf0; }
          .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>🚨 VersaCompiler Performance Regression Alert</h2>
          <p>Se han detectado regresiones críticas en los tests de performance</p>
        </div>

        <div class="stats">
          <h3>📊 Resumen:</h3>
          <ul>
            <li><strong>Total de regresiones:</strong> ${alerts.length}</li>
            <li><strong>Críticas:</strong> ${criticalCount}</li>
            <li><strong>Altas:</strong> ${highCount}</li>
            <li><strong>Timestamp:</strong> ${alerts[0]?.timestamp}</li>
          </ul>
        </div>

        <h3>🔍 Detalles de Regresiones:</h3>
        ${alerts.map(alert => `
          <div class="alert ${alert.severity}">
            <h4>${alert.testName}</h4>
            <p><strong>Cambio:</strong> +${alert.changePercentage.toFixed(1)}% más lento</p>
            <p><strong>Tiempo anterior:</strong> ${alert.previousTime.toFixed(2)}ms</p>
            <p><strong>Tiempo actual:</strong> ${alert.currentTime.toFixed(2)}ms</p>
            <p><strong>Severidad:</strong> ${alert.severity.toUpperCase()}</p>
          </div>
        `).join('')}

        <div style="margin-top: 30px; padding: 15px; background: #f0f0f0; border-radius: 5px;">
          <p><strong>Próximos pasos:</strong></p>
          <ol>
            <li>Revisar los cambios recientes en el código</li>
            <li>Ejecutar tests de performance localmente</li>
            <li>Identificar la causa raíz de la regresión</li>
            <li>Implementar correcciones necesarias</li>
          </ol>
        </div>
      </body>
    </html>
    `;
  }

  /**
   * Genera payload para webhook
   */
  private generateWebhookPayload(alerts: RegressionAlert[]): any {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;

    // Formato para Slack
    if (this.webhookUrl?.includes('slack.com')) {
      return {
        text: `🚨 VersaCompiler Performance Regression Alert`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Total Regressions',
                value: alerts.length.toString(),
                short: true
              },
              {
                title: 'Critical Regressions',
                value: criticalCount.toString(),
                short: true
              },
              {
                title: 'Worst Regression',
                value: `${alerts[0].testName}: +${alerts[0].changePercentage.toFixed(1)}%`,
                short: false
              }
            ]
          }
        ]
      };
    }

    // Formato para Discord
    return {
      content: `🚨 **VersaCompiler Performance Regression Alert**`,
      embeds: [
        {
          title: 'Performance Regression Detected',
          color: 0xff4444,
          fields: [
            {
              name: 'Total Regressions',
              value: alerts.length.toString(),
              inline: true
            },
            {
              name: 'Critical Regressions',
              value: criticalCount.toString(),
              inline: true
            },
            {
              name: 'Timestamp',
              value: alerts[0]?.timestamp || 'unknown',
              inline: false
            }
          ]
        }
      ]
    };
  }

  private parseTimeMs(timeStr: string): number {
    const match = timeStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private getSeverity(changePercentage: number): RegressionAlert['severity'] {
    if (changePercentage >= this.thresholds.failure) return 'critical';
    if (changePercentage >= this.thresholds.critical) return 'high';
    if (changePercentage >= this.thresholds.warning) return 'medium';
    return 'low';
  }
}

// Script principal para uso en CI/CD
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const alertSystem = new PerformanceAlertSystem();
  const historyPath = path.join(process.cwd(), 'performance-results', 'performance-history.json');

  alertSystem.analyzeResults(historyPath)
    .then(alerts => alertSystem.sendAlerts(alerts))
    .catch(error => {
      console.error('❌ Error in performance alert system:', error);
      process.exit(1);
    });
}
