/**
 * Project Analysis Service
 * 
 * Analyzes project structure, dependencies, configuration files, and codebase organization
 * to provide intelligent development context for AI-enhanced workflows.
 * 
 * Key Features:
 * - Project structure analysis (directories, file organization)
 * - Dependency analysis (package.json, imports/exports)
 * - Configuration file analysis (build tools, frameworks)
 * - Code pattern detection (architecture, conventions)
 * - Technology stack identification
 * - Monorepo/workspace analysis
 * 
 * Designed to work with various project types while being lightweight and cacheable.
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

/**
 * Project Analysis Service
 * Provides comprehensive project structure and dependency analysis
 */
class ProjectAnalysisService {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.cacheEnabled = options.cacheEnabled !== false;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 10 * 60 * 1000; // 10 minutes
    this.initialized = false;
  }

  /**
   * Initialize the project analysis service
   * @throws {Error} If project root is not accessible
   */
  async initialize() {
    try {
      // Verify project root exists
      const stats = await fs.stat(this.projectRoot);
      if (!stats.isDirectory()) {
        throw new Error(`Project root is not a directory: ${this.projectRoot}`);
      }
      
      this.initialized = true;
      console.log('📁 Project Analysis Service initialized');
      
    } catch (error) {
      throw new Error(`Failed to initialize Project Analysis Service: ${error.message}`);
    }
  }

  /**
   * Analyze complete project structure and characteristics
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Comprehensive project analysis
   */
  async analyzeProjectStructure(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = 'project-structure';
    if (this.cacheEnabled && this.hasValidCache(cacheKey)) {
      console.log('📋 Using cached project structure');
      return this.cache.get(cacheKey).data;
    }

    try {
      // Analyze different aspects in parallel
      const [
        directoryStructure,
        dependencies,
        configurations,
        technologies,
        codePatterns,
        fileStatistics
      ] = await Promise.all([
        this.analyzeDirectoryStructure(),
        this.analyzeDependencies(),
        this.analyzeConfigurations(),
        this.identifyTechnologies(),
        this.analyzeCodePatterns(),
        this.analyzeFileStatistics()
      ]);

      const projectAnalysis = {
        overview: {
          name: await this.getProjectName(),
          type: this.identifyProjectType(dependencies, configurations),
          structure: this.categorizeProjectStructure(directoryStructure),
          size: fileStatistics.totalFiles
        },
        directories: directoryStructure,
        dependencies,
        configurations,
        technologies,
        patterns: codePatterns,
        statistics: fileStatistics,
        architecture: this.inferArchitecture(directoryStructure, dependencies),
        recommendations: this.generateRecommendations(
          directoryStructure, 
          dependencies, 
          configurations
        )
      };

      // Cache the result
      if (this.cacheEnabled) {
        this.cache.set(cacheKey, {
          data: projectAnalysis,
          timestamp: Date.now()
        });
      }

      return projectAnalysis;

    } catch (error) {
      throw new Error(`Failed to analyze project structure: ${error.message}`);
    }
  }

  /**
   * Analyze directory structure and organization
   * @returns {Promise<Object>} Directory structure analysis
   */
  async analyzeDirectoryStructure() {
    const structure = {
      root: this.projectRoot,
      directories: [],
      depth: 0,
      organization: 'unknown'
    };

    try {
      // Get directory tree (limit depth for performance)
      const directories = await this.scanDirectories(this.projectRoot, 0, 4);
      
      structure.directories = directories;
      structure.depth = this.calculateMaxDepth(directories);
      structure.organization = this.categorizeOrganization(directories);
      
      return structure;

    } catch (error) {
      throw new Error(`Failed to analyze directory structure: ${error.message}`);
    }
  }

  /**
   * Recursively scan directories up to a maximum depth
   * @param {string} dirPath - Directory to scan
   * @param {number} currentDepth - Current scanning depth
   * @param {number} maxDepth - Maximum depth to scan
   * @returns {Promise<Array>} Directory information
   */
  async scanDirectories(dirPath, currentDepth = 0, maxDepth = 3) {
    if (currentDepth >= maxDepth) return [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const directories = [];

      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldIgnoreDirectory(entry.name)) {
          const fullPath = path.join(dirPath, entry.name);
          const relativePath = path.relative(this.projectRoot, fullPath);
          
          const directoryInfo = {
            name: entry.name,
            path: relativePath,
            depth: currentDepth + 1,
            files: await this.countFiles(fullPath),
            subdirectories: [],
            purpose: this.inferDirectoryPurpose(entry.name, relativePath)
          };

          // Recursively scan subdirectories
          directoryInfo.subdirectories = await this.scanDirectories(
            fullPath, 
            currentDepth + 1, 
            maxDepth
          );

          directories.push(directoryInfo);
        }
      }

      return directories;

    } catch (error) {
      console.warn(`Could not scan directory ${dirPath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Analyze project dependencies from various sources
   * @returns {Promise<Object>} Dependency analysis
   */
  async analyzeDependencies() {
    const dependencies = {
      package: {},
      workspaces: [],
      devDependencies: {},
      technologies: new Set(),
      frameworks: new Set()
    };

    try {
      // Analyze root package.json
      const rootPackage = await this.analyzePackageJson(this.projectRoot);
      if (rootPackage) {
        dependencies.package = rootPackage;
        this.extractTechnologies(rootPackage, dependencies);
        
        // Analyze workspaces if present
        if (rootPackage.workspaces) {
          dependencies.workspaces = await this.analyzeWorkspaces(rootPackage.workspaces);
        }
      }

      // Look for additional package.json files in subdirectories
      const additionalPackages = await this.findAdditionalPackages();
      dependencies.additionalPackages = additionalPackages;

      return dependencies;

    } catch (error) {
      throw new Error(`Failed to analyze dependencies: ${error.message}`);
    }
  }

  /**
   * Analyze configuration files in the project
   * @returns {Promise<Object>} Configuration analysis
   */
  async analyzeConfigurations() {
    const configurations = {
      build: [],
      testing: [],
      linting: [],
      deployment: [],
      development: [],
      unknown: []
    };

    try {
      // Common configuration file patterns
      const configPatterns = [
        '*.config.js', '*.config.ts', '*.config.json',
        'webpack.*', 'vite.*', 'rollup.*',
        'jest.*', '*.test.config.*',
        'eslint*', 'prettier*', 'babel*',
        'docker*', 'deploy*', 'ci/*', '.github/*',
        'tsconfig.*', 'jsconfig.*'
      ];

      const configFiles = await this.findConfigurationFiles(configPatterns);
      
      for (const configFile of configFiles) {
        const category = this.categorizeConfiguration(configFile);
        configurations[category].push({
          file: configFile,
          purpose: this.inferConfigPurpose(configFile)
        });
      }

      return configurations;

    } catch (error) {
      throw new Error(`Failed to analyze configurations: ${error.message}`);
    }
  }

  /**
   * Identify technologies used in the project
   * @returns {Promise<Object>} Technology analysis
   */
  async identifyTechnologies() {
    const technologies = {
      languages: new Set(),
      frameworks: new Set(),
      tools: new Set(),
      databases: new Set(),
      deployment: new Set()
    };

    try {
      // Analyze file extensions
      const fileExtensions = await this.getFileExtensions();
      this.inferLanguagesFromExtensions(fileExtensions, technologies);

      // Analyze package.json dependencies
      const packageData = await this.analyzePackageJson(this.projectRoot);
      if (packageData) {
        this.inferTechnologiesFromDependencies(packageData, technologies);
      }

      // Analyze configuration files
      const configFiles = await this.findConfigurationFiles(['*']);
      this.inferTechnologiesFromConfigs(configFiles, technologies);

      // Convert Sets to arrays for serialization
      return {
        languages: Array.from(technologies.languages),
        frameworks: Array.from(technologies.frameworks),
        tools: Array.from(technologies.tools),
        databases: Array.from(technologies.databases),
        deployment: Array.from(technologies.deployment)
      };

    } catch (error) {
      throw new Error(`Failed to identify technologies: ${error.message}`);
    }
  }

  /**
   * Analyze code patterns and conventions
   * @returns {Promise<Object>} Code pattern analysis
   */
  async analyzeCodePatterns() {
    const patterns = {
      architecture: 'unknown',
      conventions: [],
      testPatterns: [],
      buildPatterns: [],
      organizationScore: 0
    };

    try {
      // Analyze directory structure for architectural patterns
      const directories = await this.scanDirectories(this.projectRoot, 0, 3);
      patterns.architecture = this.inferArchitecturalPattern(directories);
      
      // Analyze naming conventions
      patterns.conventions = this.analyzeNamingConventions(directories);
      
      // Analyze test patterns
      patterns.testPatterns = await this.analyzeTestPatterns();
      
      // Analyze build patterns
      patterns.buildPatterns = await this.analyzeBuildPatterns();
      
      // Calculate organization score
      patterns.organizationScore = this.calculateOrganizationScore(
        directories, 
        patterns.conventions
      );

      return patterns;

    } catch (error) {
      throw new Error(`Failed to analyze code patterns: ${error.message}`);
    }
  }

  /**
   * Analyze file statistics across the project
   * @returns {Promise<Object>} File statistics
   */
  async analyzeFileStatistics() {
    const statistics = {
      totalFiles: 0,
      totalSize: 0,
      filesByType: {},
      largestFiles: [],
      emptyDirectories: 0,
      averageFileSize: 0
    };

    try {
      // Get all files (excluding common ignore patterns)
      const allFiles = await glob('**/*', {
        cwd: this.projectRoot,
        ignore: this.getIgnorePatterns(),
        nodir: true
      });

      statistics.totalFiles = allFiles.length;

      // Analyze each file
      const fileAnalysis = [];
      for (const file of allFiles.slice(0, 1000)) { // Limit for performance
        try {
          const fullPath = path.join(this.projectRoot, file);
          const stats = await fs.stat(fullPath);
          const ext = path.extname(file) || 'no-extension';
          
          fileAnalysis.push({
            path: file,
            size: stats.size,
            extension: ext,
            modified: stats.mtime
          });
          
          statistics.totalSize += stats.size;
          statistics.filesByType[ext] = (statistics.filesByType[ext] || 0) + 1;
        } catch (error) {
          // Skip files that can't be analyzed
          continue;
        }
      }

      // Calculate averages and find largest files
      statistics.averageFileSize = Math.round(statistics.totalSize / statistics.totalFiles);
      statistics.largestFiles = fileAnalysis
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      return statistics;

    } catch (error) {
      throw new Error(`Failed to analyze file statistics: ${error.message}`);
    }
  }

  /**
   * Analyze package.json file
   * @param {string} dirPath - Directory containing package.json
   * @returns {Promise<Object|null>} Package.json analysis or null if not found
   */
  async analyzePackageJson(dirPath) {
    try {
      const packagePath = path.join(dirPath, 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageData = JSON.parse(packageContent);
      
      return {
        name: packageData.name,
        version: packageData.version,
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {},
        scripts: packageData.scripts || {},
        workspaces: packageData.workspaces || [],
        engines: packageData.engines || {},
        type: packageData.type || 'commonjs'
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract technologies from dependencies
   * @param {Object} packageData - Package.json data
   * @param {Object} technologies - Technologies object to populate
   */
  extractTechnologies(packageData, technologies) {
    const allDeps = {
      ...packageData.dependencies,
      ...packageData.devDependencies
    };

    Object.keys(allDeps).forEach(dep => {
      // Identify frameworks
      if (dep.includes('react')) technologies.frameworks.add('React');
      if (dep.includes('vue')) technologies.frameworks.add('Vue.js');
      if (dep.includes('angular')) technologies.frameworks.add('Angular');
      if (dep.includes('svelte')) technologies.frameworks.add('Svelte');
      if (dep.includes('next')) technologies.frameworks.add('Next.js');
      if (dep.includes('nuxt')) technologies.frameworks.add('Nuxt.js');
      if (dep.includes('express')) technologies.frameworks.add('Express.js');
      if (dep.includes('fastify')) technologies.frameworks.add('Fastify');
      if (dep.includes('electron')) technologies.frameworks.add('Electron');

      // Identify technologies
      if (dep.includes('typescript')) technologies.technologies.add('TypeScript');
      if (dep.includes('webpack')) technologies.technologies.add('Webpack');
      if (dep.includes('vite')) technologies.technologies.add('Vite');
      if (dep.includes('rollup')) technologies.technologies.add('Rollup');
      if (dep.includes('babel')) technologies.technologies.add('Babel');
      if (dep.includes('eslint')) technologies.technologies.add('ESLint');
      if (dep.includes('prettier')) technologies.technologies.add('Prettier');
      if (dep.includes('jest')) technologies.technologies.add('Jest');
      if (dep.includes('vitest')) technologies.technologies.add('Vitest');
    });
  }

  /**
   * Infer project architecture from directory structure
   * @param {Object} directoryStructure - Directory structure data
   * @param {Object} dependencies - Dependencies data
   * @returns {Object} Architecture analysis
   */
  inferArchitecture(directoryStructure, dependencies) {
    const architecture = {
      pattern: 'unknown',
      isMonorepo: false,
      hasBackend: false,
      hasFrontend: false,
      hasDatabase: false,
      hasTests: false,
      complexity: 'simple'
    };

    // Check for monorepo pattern
    architecture.isMonorepo = Boolean(dependencies.workspaces?.length > 0);

    // Analyze directories for architectural patterns
    const dirNames = this.getAllDirectoryNames(directoryStructure.directories);
    
    // Check for common patterns
    if (dirNames.includes('src') && dirNames.includes('tests')) {
      architecture.pattern = 'standard';
    }
    if (dirNames.includes('packages')) {
      architecture.pattern = 'monorepo';
      architecture.isMonorepo = true;
    }
    if (dirNames.includes('client') && dirNames.includes('server')) {
      architecture.pattern = 'fullstack';
      architecture.hasFrontend = true;
      architecture.hasBackend = true;
    }

    // Check for specific components
    architecture.hasFrontend = dirNames.some(name => 
      ['client', 'frontend', 'web', 'ui', 'app'].includes(name)
    );
    architecture.hasBackend = dirNames.some(name => 
      ['server', 'backend', 'api', 'services'].includes(name)
    );
    architecture.hasDatabase = dirNames.some(name => 
      ['db', 'database', 'migrations', 'schemas'].includes(name)
    );
    architecture.hasTests = dirNames.some(name => 
      ['test', 'tests', '__tests__', 'spec'].includes(name)
    );

    // Determine complexity
    const packageCount = dependencies.workspaces?.length || 1;
    const directoryCount = directoryStructure.directories?.length || 0;
    
    if (packageCount > 5 || directoryCount > 15) {
      architecture.complexity = 'complex';
    } else if (packageCount > 2 || directoryCount > 8) {
      architecture.complexity = 'moderate';
    }

    return architecture;
  }

  /**
   * Should ignore this directory during scanning
   * @param {string} dirName - Directory name
   * @returns {boolean} True if should ignore
   */
  shouldIgnoreDirectory(dirName) {
    const ignorePatterns = [
      'node_modules', '.git', '.svn', '.hg',
      'dist', 'build', 'coverage', '.nyc_output',
      'tmp', 'temp', '.cache', '.vscode', '.idea',
      'logs', '*.log'
    ];
    
    return ignorePatterns.some(pattern => 
      dirName === pattern || dirName.startsWith('.')
    );
  }

  /**
   * Count files in a directory (non-recursively)
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Number of files
   */
  async countFiles(dirPath) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.filter(entry => entry.isFile()).length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get patterns to ignore when scanning files
   * @returns {Array<string>} Ignore patterns
   */
  getIgnorePatterns() {
    return [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.nyc_output/**',
      'tmp/**',
      'temp/**',
      '.cache/**',
      'logs/**',
      '*.log'
    ];
  }

  /**
   * Generate recommendations based on project analysis
   * @param {Object} directories - Directory structure
   * @param {Object} dependencies - Dependencies analysis
   * @param {Object} configurations - Configuration analysis
   * @returns {Array} List of recommendations
   */
  generateRecommendations(directories, dependencies, configurations) {
    const recommendations = [];

    // Check for missing common files
    if (!configurations.testing.length) {
      recommendations.push({
        type: 'testing',
        priority: 'medium',
        message: 'Consider adding a testing framework like Jest or Vitest'
      });
    }

    if (!configurations.linting.length) {
      recommendations.push({
        type: 'code-quality',
        priority: 'medium',
        message: 'Consider adding ESLint for code quality'
      });
    }

    // Check for outdated or missing configs
    if (dependencies.package.type !== 'module' && 
        Object.keys(dependencies.package.dependencies || {}).some(dep => dep.includes('vite'))) {
      recommendations.push({
        type: 'configuration',
        priority: 'low',
        message: 'Consider updating package.json to use "type": "module" for better ES module support'
      });
    }

    return recommendations;
  }

  /**
   * Check if cached data is still valid
   * @param {string} cacheKey - Cache key to check
   * @returns {boolean} True if cache is valid
   */
  hasValidCache(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const age = Date.now() - cached.timestamp;
    return age < this.cacheTimeout;
  }

  /**
   * Get project name from package.json or directory name
   * @returns {Promise<string>} Project name
   */
  async getProjectName() {
    const packageData = await this.analyzePackageJson(this.projectRoot);
    if (packageData?.name) {
      return packageData.name;
    }
    
    return path.basename(this.projectRoot);
  }

  /**
   * Get all directory names from directory structure
   * @param {Array} directories - Directory structure array
   * @returns {Array<string>} Flattened directory names
   */
  getAllDirectoryNames(directories) {
    const names = [];
    
    function collectNames(dirs) {
      for (const dir of dirs) {
        names.push(dir.name);
        if (dir.subdirectories) {
          collectNames(dir.subdirectories);
        }
      }
    }
    
    collectNames(directories);
    return names;
  }

  /**
   * Get service status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      initialized: this.initialized,
      projectRoot: this.projectRoot,
      cacheEnabled: this.cacheEnabled,
      cacheSize: this.cache.size
    };
  }

  // Additional helper methods would be implemented here for:
  // - identifyProjectType()
  // - categorizeProjectStructure() 
  // - inferDirectoryPurpose()
  // - analyzeWorkspaces()
  // - findAdditionalPackages()
  // - findConfigurationFiles()
  // - categorizeConfiguration()
  // - getFileExtensions()
  // - inferLanguagesFromExtensions()
  // - inferTechnologiesFromDependencies()
  // - inferTechnologiesFromConfigs()
  // - analyzeTestPatterns()
  // - analyzeBuildPatterns()
  // - calculateOrganizationScore()
  // etc.
}

module.exports = {
  ProjectAnalysisService
};