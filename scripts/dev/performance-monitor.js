#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors key performance metrics during development
 */

const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            memory: [],
            cpu: [],
            database: [],
            renderer: []
        };
        this.startTime = Date.now();
    }

    /**
     * Start monitoring performance metrics
     */
    start() {
        console.log('🔍 Starting performance monitoring...');
        
        // Monitor memory usage
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.metrics.memory.push({
                timestamp: Date.now(),
                rss: memUsage.rss / 1024 / 1024, // MB
                heapTotal: memUsage.heapTotal / 1024 / 1024, // MB
                heapUsed: memUsage.heapUsed / 1024 / 1024, // MB
                external: memUsage.external / 1024 / 1024 // MB
            });
        }, 5000); // Every 5 seconds

        // Monitor CPU usage (simplified)
        setInterval(() => {
            const cpuUsage = process.cpuUsage();
            this.metrics.cpu.push({
                timestamp: Date.now(),
                user: cpuUsage.user / 1000, // Convert to milliseconds
                system: cpuUsage.system / 1000
            });
        }, 5000);

        // Cleanup old metrics (keep last 100 entries)
        setInterval(() => {
            Object.keys(this.metrics).forEach(key => {
                if (this.metrics[key].length > 100) {
                    this.metrics[key] = this.metrics[key].slice(-100);
                }
            });
        }, 30000); // Every 30 seconds
    }

    /**
     * Get current performance snapshot
     */
    getSnapshot() {
        const now = Date.now();
        const uptime = Math.round((now - this.startTime) / 1000);
        
        const latestMemory = this.metrics.memory.slice(-1)[0] || {};
        const latestCpu = this.metrics.cpu.slice(-1)[0] || {};

        return {
            uptime: `${uptime}s`,
            memory: {
                rss: `${latestMemory.rss?.toFixed(2) || 0} MB`,
                heapUsed: `${latestMemory.heapUsed?.toFixed(2) || 0} MB`,
                heapTotal: `${latestMemory.heapTotal?.toFixed(2) || 0} MB`
            },
            cpu: {
                user: `${latestCpu.user?.toFixed(2) || 0}ms`,
                system: `${latestCpu.system?.toFixed(2) || 0}ms`
            },
            metricsCount: {
                memory: this.metrics.memory.length,
                cpu: this.metrics.cpu.length
            }
        };
    }

    /**
     * Save performance report
     */
    saveReport() {
        const report = {
            generated: new Date().toISOString(),
            uptime: Date.now() - this.startTime,
            metrics: this.metrics,
            summary: this.getSnapshot()
        };

        const reportPath = path.join('logs', 'performance-report.json');
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📊 Performance report saved to: ${reportPath}`);
        return reportPath;
    }

    /**
     * Display current metrics
     */
    displayMetrics() {
        const snapshot = this.getSnapshot();
        console.clear();
        console.log('🚀 Attrition Performance Monitor');
        console.log('================================');
        console.log(`⏱️  Uptime: ${snapshot.uptime}`);
        console.log(`💾 Memory RSS: ${snapshot.memory.rss}`);
        console.log(`🧠 Heap Used: ${snapshot.memory.heapUsed} / ${snapshot.memory.heapTotal}`);
        console.log(`⚙️  CPU User: ${snapshot.cpu.user}`);
        console.log(`🖥️  CPU System: ${snapshot.cpu.system}`);
        console.log(`📈 Metrics Collected: ${snapshot.metricsCount.memory} samples`);
        console.log('\nPress Ctrl+C to stop and save report');
    }
}

// Main execution
if (require.main === module) {
    const monitor = new PerformanceMonitor();
    
    monitor.start();
    
    // Display metrics every 10 seconds
    setInterval(() => {
        monitor.displayMetrics();
    }, 10000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping performance monitor...');
        monitor.saveReport();
        process.exit(0);
    });

    // Initial display
    monitor.displayMetrics();
}

module.exports = PerformanceMonitor;
