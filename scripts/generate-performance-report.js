#!/usr/bin/env node

/**
 * Generador de reportes de performance para VersaCompiler
 * Este script genera reportes detallados y dashboards de performance
 */

import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceReportGenerator {
    constructor() {
        this.resultsDir = path.join(process.cwd(), 'performance-results');
        this.historyFile = path.join(
            this.resultsDir,
            'performance-history.json',
        );
        this.dashboardFile = path.join(this.resultsDir, 'dashboard.html');
        this.reportFile = path.join(this.resultsDir, 'latest-report.json');
    }

    async ensureDirectoryExists() {
        await fs.mkdir(this.resultsDir, { recursive: true });
    }

    async getEnvironmentInfo() {
        let gitCommit, branch;

        try {
            const { execSync } = require('child_process');
            gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' })
                .trim()
                .substring(0, 8);
            branch = execSync('git rev-parse --abbrev-ref HEAD', {
                encoding: 'utf8',
            }).trim();
        } catch {
            // Ignore git errors in non-git environments
        }

        return {
            nodeVersion: process.version,
            platform: `${os.platform()} ${os.arch()}`,
            cpuCount: os.cpus().length,
            totalMemory: os.totalmem(),
            gitCommit,
            branch,
            timestamp: new Date().toISOString(),
        };
    }

    async loadHistory() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }
    async generateReport() {
        const history = await this.loadHistory();
        const environment = await this.getEnvironmentInfo();
        const timestamp = Date.now();

        const currentResults = history
            .map(h => h.results[h.results.length - 1])
            .filter(Boolean);

        const regressions = [];
        const improvements = [];

        // Agregar análisis de tendencias individuales por test
        const resultsWithTrends = currentResults.map(current => {
            // Buscar el historial de este test específico
            const testHistory = history.find(h => h.testName === current.name);
            let trend = 'stable';
            let trendChange = null;
            let previousAvg = null;

            if (testHistory && testHistory.results.length >= 2) {
                const previous =
                    testHistory.results[testHistory.results.length - 2];
                previousAvg = previous.avg;
                const perfChange =
                    ((current.avg - previous.avg) / previous.avg) * 100;

                trendChange = perfChange;

                if (perfChange > 10) {
                    trend = 'regression';
                    regressions.push({
                        testName: testHistory.testName,
                        change: `+${perfChange.toFixed(1)}%`,
                        previousAvg: previous.avg,
                        currentAvg: current.avg,
                    });
                } else if (perfChange < -10) {
                    trend = 'improvement';
                    improvements.push({
                        testName: testHistory.testName,
                        change: `${Math.abs(perfChange).toFixed(1)}% faster`,
                        previousAvg: previous.avg,
                        currentAvg: current.avg,
                    });
                } else if (Math.abs(perfChange) > 5) {
                    trend =
                        perfChange > 0
                            ? 'slight-regression'
                            : 'slight-improvement';
                }
            }

            return {
                ...current,
                trend,
                trendChange,
                previousAvg,
            };
        });

        const avgPerformance =
            resultsWithTrends.length > 0
                ? resultsWithTrends.reduce((sum, r) => sum + r.avg, 0) /
                  resultsWithTrends.length
                : 0;
        const report = {
            timestamp,
            environment,
            totalTests: resultsWithTrends.length,
            passedTests: resultsWithTrends.filter(r => r.successRate === 1)
                .length,
            avgPerformance,
            regressions,
            improvements,
            results: resultsWithTrends,
            summary: {
                fastestTest:
                    resultsWithTrends.length > 0
                        ? resultsWithTrends.reduce((min, r) =>
                              r.avg < min.avg ? r : min,
                          )
                        : null,
                slowestTest:
                    resultsWithTrends.length > 0
                        ? resultsWithTrends.reduce((max, r) =>
                              r.avg > max.avg ? r : max,
                          )
                        : null,
                totalTime: resultsWithTrends.reduce((sum, r) => sum + r.avg, 0),
                memoryUsage: {
                    average: resultsWithTrends
                        .filter(r => r.avgMemoryUsage)
                        .reduce(
                            (sum, r, _, arr) =>
                                sum + (r.avgMemoryUsage || 0) / arr.length,
                            0,
                        ),
                },
            },
        };

        await this.ensureDirectoryExists();
        await fs.writeFile(this.reportFile, JSON.stringify(report, null, 2));

        return report;
    }

    async generateMarkdownReport() {
        const report = await this.generateReport();
        const markdown = `# VersaCompiler Performance Report

Generated: ${new Date(report.timestamp).toLocaleDateString('es-ES')}

## 📊 Summary

- **Total Tests**: ${report.totalTests}
- **Passed Tests**: ${report.passedTests}
- **Success Rate**: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%
- **Average Performance**: ${report.avgPerformance.toFixed(2)}ms
- **Total Time**: ${report.summary.totalTime.toFixed(2)}ms

## 🖥️ Environment

- **Node.js**: ${report.environment.nodeVersion}
- **Platform**: ${report.environment.platform}
- **CPUs**: ${report.environment.cpuCount}
- **Memory**: ${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB
${report.environment.gitCommit ? `- **Git**: ${report.environment.branch}@${report.environment.gitCommit}` : ''}

## 🚀 Performance Highlights

${report.summary.fastestTest ? `**Fastest Test**: ${report.summary.fastestTest.name} (${report.summary.fastestTest.avg.toFixed(2)}ms)` : 'No data available'}

${report.summary.slowestTest ? `**Slowest Test**: ${report.summary.slowestTest.name} (${report.summary.slowestTest.avg.toFixed(2)}ms)` : 'No data available'}

## 📈 Changes Since Last Run

### ⚠️ Regressions
${
    report.regressions.length > 0
        ? report.regressions
              .map(
                  r =>
                      `- **${r.testName}**: ${r.change} (${r.previousAvg.toFixed(2)}ms → ${r.currentAvg.toFixed(2)}ms)`,
              )
              .join('\n')
        : '✅ No regressions detected'
}

### 🎯 Improvements
${
    report.improvements.length > 0
        ? report.improvements
              .map(
                  i =>
                      `- **${i.testName}**: ${i.change} (${i.previousAvg.toFixed(2)}ms → ${i.currentAvg.toFixed(2)}ms)`,
              )
              .join('\n')
        : '📊 No significant improvements'
}

## 📋 Detailed Results

| Test Name | Avg (ms) | Min (ms) | Max (ms) | Success Rate |
|-----------|----------|----------|----------|--------------|
${report.results.map(r => `| ${r.name} | ${r.avg.toFixed(2)} | ${r.min.toFixed(2)} | ${r.max.toFixed(2)} | ${(r.successRate * 100).toFixed(1)}% |`).join('\n')}

---

*Report generated automatically by VersaCompiler Performance Testing System*
`;

        const markdownFile = path.join(this.resultsDir, 'latest-report.md');
        await fs.writeFile(markdownFile, markdown);

        console.log(`📄 Markdown report generated: ${markdownFile}`);
        return markdownFile;
    }
    async generateDashboard() {
        const report = await this.generateReport();
        const history = await this.loadHistory();

        // Crear datos para el gráfico usando solo puntos de control (índices)
        const chartData = history.map(testHistory => ({
            name: testHistory.testName,
            data: testHistory.results.map((r, index) => ({
                x: index + 1, // Usar índice en lugar de timestamp
                y: r.avg,
                timestamp: new Date(r.timestamp).toLocaleString('es-ES'), // Para mostrar en tooltip
            })),
        }));

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VersaCompiler Performance Dashboard</title>    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }
        .stat-label {
            font-size: 1.1em;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }        .chart-container h2 {
            margin-bottom: 20px;
            color: #333;
            font-size: 1.8em;
        }
        .performance-table {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        .performance-table h2 {
            margin-bottom: 20px;
            color: #333;
            font-size: 1.8em;
        }
        .perf-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 1em;
        }
        .perf-table th,
        .perf-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        .perf-table th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 0.9em;
        }
        .perf-table tr:hover {
            background: #f8f9fa;
        }        .perf-table .avg-time {
            font-weight: bold;
            color: #667eea;
        }
        .perf-table .success-rate {
            color: #27ae60;
        }
        .trend-indicator {
            font-size: 1.2em;
            margin-right: 5px;
        }
        .trend-regression { color: #e74c3c; }
        .trend-improvement { color: #27ae60; }
        .trend-slight { color: #f39c12; }
        .trend-stable { color: #95a5a6; }
        .trend-change {
            font-size: 0.85em;
            font-weight: normal;
            margin-left: 5px;
        }
        .issues {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .issue-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .regression { border-left: 5px solid #e74c3c; }
        .improvement { border-left: 5px solid #27ae60; }
        .issue-card h3 {
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        .issue-list {
            list-style: none;
            padding: 0;
        }
        .issue-list li {
            padding: 12px 0;
            border-bottom: 1px solid #eee;
            font-size: 1.1em;
        }
        .environment {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-top: 20px;
        }
        .environment h3 {
            margin-bottom: 20px;
            color: #333;
            font-size: 1.5em;
        }
        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .env-item {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        .env-label {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .env-value {
            font-size: 1.1em;
            color: #333;
            margin-top: 5px;
        }
        .refresh-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 15px 25px;
            font-size: 1em;
            cursor: pointer;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }
        .refresh-btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 VersaCompiler Performance Dashboard</h1>
            <p>Última actualización: ${new Date(report.timestamp).toLocaleString('es-ES')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${report.totalTests}</div>
                <div class="stat-label">Tests Ejecutados</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${report.passedTests}</div>
                <div class="stat-label">Tests Exitosos</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${report.avgPerformance.toFixed(1)}ms</div>
                <div class="stat-label">Tiempo Promedio</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${((report.passedTests / report.totalTests) * 100).toFixed(1)}%</div>
                <div class="stat-label">Tasa de Éxito</div>
            </div>
        </div>        <div class="chart-container">
            <h2>📈 Tendencias de Performance</h2>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>

        <div class="performance-table">
            <h2>📊 Tiempos Promedio por Test</h2>            <table class="perf-table">
                <thead>
                    <tr>
                        <th>Test</th>
                        <th>Tiempo Promedio</th>
                        <th>Tiempo Mínimo</th>
                        <th>Tiempo Máximo</th>
                        <th>Tasa de Éxito</th>
                        <th>Ejecuciones</th>
                        <th>Tendencia</th>
                    </tr>
                </thead>                <tbody>
                    ${report.results
                        .map(r => {
                            const getTrendIndicator = trend => {
                                switch (trend) {
                                    case 'regression':
                                        return {
                                            icon: '🔴',
                                            label: 'Regresión',
                                            class: 'trend-regression',
                                        };
                                    case 'improvement':
                                        return {
                                            icon: '🟢',
                                            label: 'Mejora',
                                            class: 'trend-improvement',
                                        };
                                    case 'slight-regression':
                                        return {
                                            icon: '🟡',
                                            label: 'Ligera regresión',
                                            class: 'trend-slight',
                                        };
                                    case 'slight-improvement':
                                        return {
                                            icon: '🟡',
                                            label: 'Ligera mejora',
                                            class: 'trend-slight',
                                        };
                                    case 'stable':
                                        return {
                                            icon: '⚪',
                                            label: 'Estable',
                                            class: 'trend-stable',
                                        };
                                    default:
                                        return {
                                            icon: '⚫',
                                            label: 'Sin datos',
                                            class: 'trend-stable',
                                        };
                                }
                            };

                            const trendInfo = getTrendIndicator(
                                r.trend || 'stable',
                            );
                            const changeText = r.trendChange
                                ? `${r.trendChange > 0 ? '+' : ''}${r.trendChange.toFixed(1)}%`
                                : '';

                            return `
                    <tr>
                        <td><strong>${r.name}</strong></td>
                        <td class="avg-time">${r.avg.toFixed(2)}ms</td>
                        <td>${r.min.toFixed(2)}ms</td>
                        <td>${r.max.toFixed(2)}ms</td>
                        <td class="success-rate">${(r.successRate * 100).toFixed(1)}%</td>
                        <td>${r.runs}</td>
                        <td>
                            <span class="trend-indicator ${trendInfo.class}" title="${trendInfo.label}">
                                ${trendInfo.icon}
                            </span>
                            ${trendInfo.label}
                            ${changeText ? `<span class="trend-change ${trendInfo.class}">(${changeText})</span>` : ''}
                        </td>
                    </tr>
                    `;
                        })
                        .join('')}
                </tbody>
            </table>
        </div>

        <div class="issues">
            <div class="issue-card regression">
                <h3>⚠️ Regresiones Detectadas</h3>
                <ul class="issue-list">
                    ${
                        report.regressions.length > 0
                            ? report.regressions
                                  .map(
                                      r =>
                                          `<li><strong>${r.testName}</strong>: ${r.change}</li>`,
                                  )
                                  .join('')
                            : '<li>✅ No se detectaron regresiones</li>'
                    }
                </ul>
            </div>
            <div class="issue-card improvement">
                <h3>🎯 Mejoras Detectadas</h3>
                <ul class="issue-list">
                    ${
                        report.improvements.length > 0
                            ? report.improvements
                                  .map(
                                      i =>
                                          `<li><strong>${i.testName}</strong>: ${i.change}</li>`,
                                  )
                                  .join('')
                            : '<li>📊 No hay mejoras significativas</li>'
                    }
                </ul>
            </div>
        </div>

        <div class="environment">
            <h3>🖥️ Información del Entorno</h3>
            <div class="env-grid">
                <div class="env-item">
                    <div class="env-label">Node.js</div>
                    <div class="env-value">${report.environment.nodeVersion}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Plataforma</div>
                    <div class="env-value">${report.environment.platform}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">CPUs</div>
                    <div class="env-value">${report.environment.cpuCount}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Memoria</div>
                    <div class="env-value">${(report.environment.totalMemory / 1024 / 1024 / 1024).toFixed(1)} GB</div>
                </div>
                ${
                    report.environment.gitCommit
                        ? `
                <div class="env-item">
                    <div class="env-label">Git Branch</div>
                    <div class="env-value">${report.environment.branch}</div>
                </div>
                <div class="env-item">
                    <div class="env-label">Git Commit</div>
                    <div class="env-value">${report.environment.gitCommit}</div>
                </div>
                `
                        : ''
                }
            </div>
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">🔄 Actualizar</button>    <script>
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const chartData = ${JSON.stringify(chartData)};

        // Verificar si hay datos para mostrar
        if (chartData.length === 0) {
            document.getElementById('performanceChart').style.display = 'none';
            document.querySelector('.chart-container').innerHTML = '<p style="text-align: center; color: #666;">No hay datos históricos disponibles. Ejecuta más tests para ver las tendencias.</p>';        } else {
            // Preparar datasets para Chart.js usando índices (puntos de control)
            const datasets = chartData.map((test, index) => ({
                label: test.name,
                data: test.data.map(point => ({
                    x: point.x, // Ya es índice (1, 2, 3, etc.)
                    y: point.y,
                    timestamp: point.timestamp // Para tooltip
                })),
                borderColor: \`hsl(\${index * 137.5 % 360}, 70%, 50%)\`,
                backgroundColor: \`hsla(\${index * 137.5 % 360}, 70%, 50%, 0.1)\`,
                fill: false,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 6,
                pointHoverRadius: 8
            }));

            new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencias de Performance - Puntos de Control',
                            font: { size: 16 }
                        },
                        legend: {
                            position: 'top',
                            labels: { usePointStyle: true }
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const dataPoint = context[0].raw;
                                    return \`Ejecución #\${dataPoint.x} - \${dataPoint.timestamp}\`;
                                },
                                label: function(context) {
                                    return \`\${context.dataset.label}: \${context.parsed.y.toFixed(2)}ms\`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            title: {
                                display: true,
                                text: 'Número de Ejecución'
                            },
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    return '#' + value;
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Tiempo (ms)'
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        }
    </script>
</body>
</html>`;

        await fs.writeFile(this.dashboardFile, html);
        console.log(`📊 Dashboard generated: ${this.dashboardFile}`);
        return this.dashboardFile;
    }

    async runReport() {
        try {
            console.log('🚀 Generating VersaCompiler Performance Report...');

            const report = await this.generateReport();
            const dashboardPath = await this.generateDashboard();
            const markdownPath = await this.generateMarkdownReport();

            console.log('\n📊 Performance Report Summary:');
            console.log(`Total Tests: ${report.totalTests}`);
            console.log(`Passed Tests: ${report.passedTests}`);
            console.log(
                `Success Rate: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`,
            );
            console.log(
                `Average Performance: ${report.avgPerformance.toFixed(2)}ms`,
            );

            if (report.regressions.length > 0) {
                console.log('\n⚠️  Regressions detected:');
                report.regressions.forEach(r =>
                    console.log(`   - ${r.testName}: ${r.change}`),
                );
            }

            if (report.improvements.length > 0) {
                console.log('\n🎯 Improvements detected:');
                report.improvements.forEach(i =>
                    console.log(`   + ${i.testName}: ${i.change}`),
                );
            }

            console.log('\n📄 Generated files:');
            console.log(`   - JSON Report: ${this.reportFile}`);
            console.log(`   - Dashboard: ${dashboardPath}`);
            console.log(`   - Markdown: ${markdownPath}`);

            console.log('\n✅ Performance report generation completed!');
        } catch (error) {
            console.error('❌ Error generating performance report:', error);
            process.exit(1);
        }
    }
}

// Ejecutar si se llama directamente
if (
    import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`
) {
    const generator = new PerformanceReportGenerator();
    generator.runReport();
}

export default PerformanceReportGenerator;
