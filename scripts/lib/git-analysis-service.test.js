/**
 * Tests for Git Analysis Service
 * 
 * Comprehensive unit tests for the Git Analysis Service, testing git repository
 * analysis, commit processing, file change tracking, and pattern detection.
 */

const { GitAnalysisService } = require('./git-analysis-service');

// Mock simple-git
jest.mock('simple-git');
const simpleGit = require('simple-git');

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn()
  }
}));

const fs = require('fs').promises;

describe('GitAnalysisService', () => {
  let service;
  let mockGit;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock git instance
    mockGit = {
      checkIsRepo: jest.fn().mockResolvedValue(true),
      log: jest.fn(),
      branch: jest.fn(),
      status: jest.fn(),
      diffSummary: jest.fn()
    };
    
    simpleGit.mockReturnValue(mockGit);
    
    service = new GitAnalysisService({
      projectRoot: '/test/project',
      timeRange: 7,
      maxCommits: 50
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid git repository', async () => {
      await service.initialize();

      expect(service.initialized).toBe(true);
      expect(simpleGit).toHaveBeenCalledWith('/test/project');
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should throw error if not a git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);

      await expect(service.initialize()).rejects.toThrow('No git repository found at: /test/project');
    });

    it('should throw error if git check fails', async () => {
      mockGit.checkIsRepo.mockRejectedValue(new Error('Git error'));

      await expect(service.initialize()).rejects.toThrow('Failed to initialize Git Analysis Service: Git error');
    });
  });

  describe('Recent Activity Analysis', () => {
    beforeEach(async () => {
      await service.initialize();
      
      // Setup default mocks
      mockGit.log.mockResolvedValue({
        all: [
          {
            hash: 'abc123def456',
            message: 'feat: add new feature',
            date: new Date().toISOString(),
            author_name: 'John Doe',
            author_email: 'john@example.com'
          }
        ]
      });

      mockGit.branch.mockResolvedValue({
        current: 'main',
        tracking: 'origin/main',
        ahead: 0,
        behind: 0
      });

      mockGit.status.mockResolvedValue({
        isClean: () => true,
        files: []
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [
          {
            file: 'src/test.js',
            changes: 10,
            insertions: 8,
            deletions: 2,
            binary: false
          }
        ],
        insertions: 8,
        deletions: 2
      });
    });

    it('should analyze recent activity successfully', async () => {
      const result = await service.analyzeRecentActivity();

      expect(result).toHaveProperty('timeRange');
      expect(result).toHaveProperty('repository');
      expect(result).toHaveProperty('commits');
      expect(result).toHaveProperty('files');
      expect(result).toHaveProperty('activity');

      expect(result.repository.currentBranch).toBe('main');
      expect(result.commits.total).toBe(1);
      expect(result.files.changed.total).toBeGreaterThan(0);
    });

    it('should handle uncommitted changes', async () => {
      mockGit.status.mockResolvedValue({
        isClean: () => false,
        files: [{ path: 'modified.js' }, { path: 'new.js' }]
      });

      const result = await service.analyzeRecentActivity();

      expect(result.repository.hasUncommittedChanges).toBe(true);
      expect(result.repository.uncommittedFiles).toBe(2);
    });

    it('should handle branch ahead/behind status', async () => {
      mockGit.branch.mockResolvedValue({
        current: 'feature-branch',
        tracking: 'origin/main',
        ahead: 3,
        behind: 1
      });

      const result = await service.analyzeRecentActivity();

      expect(result.repository.ahead).toBe(3);
      expect(result.repository.behind).toBe(1);
    });

    it('should handle custom time range', async () => {
      const customOptions = { timeRange: 14 };
      
      await service.analyzeRecentActivity(customOptions);

      expect(mockGit.log).toHaveBeenCalledWith({
        since: expect.any(String),
        maxCount: 50
      });
    });
  });

  describe('Commit Processing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should process commits with file changes', async () => {
      const mockCommits = [
        {
          hash: 'abc123',
          message: 'fix: resolve bug in parser',
          date: new Date().toISOString(),
          author_name: 'Jane Doe',
          author_email: 'jane@example.com'
        }
      ];

      mockGit.log.mockResolvedValue({ all: mockCommits });
      mockGit.diffSummary.mockResolvedValue({
        files: [
          {
            file: 'parser.js',
            changes: 15,
            insertions: 10,
            deletions: 5,
            binary: false
          }
        ],
        insertions: 10,
        deletions: 5
      });

      const result = await service.getRecentCommits(new Date(), 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        hash: 'abc123',
        shortHash: 'abc123'.substring(0, 8),
        message: 'fix: resolve bug in parser',
        author: {
          name: 'Jane Doe',
          email: 'jane@example.com'
        },
        type: 'bugfix',
        impact: 'low'
      });
      expect(result[0].files).toHaveLength(1);
      expect(result[0].stats.filesChanged).toBe(1);
    });

    it('should handle commits with diff errors gracefully', async () => {
      const mockCommits = [
        {
          hash: 'def456',
          message: 'initial commit',
          date: new Date().toISOString(),
          author_name: 'Developer',
          author_email: 'dev@example.com'
        }
      ];

      mockGit.log.mockResolvedValue({ all: mockCommits });
      mockGit.diffSummary.mockRejectedValue(new Error('Could not get diff'));

      const result = await service.getRecentCommits(new Date(), 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        hash: 'def456',
        type: 'initial',
        error: 'Could not analyze commit diff: Could not get diff'
      });
    });
  });

  describe('Commit Categorization', () => {
    it('should categorize feature commits', () => {
      expect(service.categorizeCommit('feat: add new dashboard')).toBe('feature');
      expect(service.categorizeCommit('feature: implement user auth')).toBe('feature');
    });

    it('should categorize bug fix commits', () => {
      expect(service.categorizeCommit('fix: resolve memory leak')).toBe('bugfix');
      expect(service.categorizeCommit('bug: fix validation error')).toBe('bugfix');
    });

    it('should categorize refactor commits', () => {
      expect(service.categorizeCommit('refactor: simplify data processing')).toBe('refactor');
    });

    it('should categorize test commits', () => {
      expect(service.categorizeCommit('test: add unit tests for parser')).toBe('test');
    });

    it('should categorize documentation commits', () => {
      expect(service.categorizeCommit('docs: update API documentation')).toBe('documentation');
    });

    it('should categorize other commits', () => {
      expect(service.categorizeCommit('random commit message')).toBe('other');
    });
  });

  describe('Path Analysis', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should analyze changes for specific paths', async () => {
      const mockLog = {
        all: [
          {
            hash: 'abc123',
            message: 'update component',
            date: new Date().toISOString(),
            author_name: 'Developer'
          }
        ],
        total: 5,
        latest: {
          hash: 'abc123',
          date: new Date().toISOString()
        }
      };

      mockGit.log.mockResolvedValue(mockLog);
      
      fs.stat.mockResolvedValue({
        size: 1024,
        birthtime: new Date('2023-01-01'),
        mtime: new Date()
      });

      const paths = ['src/components/Button.tsx'];
      const result = await service.analyzePathChanges(paths);

      expect(mockGit.log).toHaveBeenCalledWith({
        file: 'src/components/Button.tsx',
        maxCount: 20
      });

      expect(result['src/components/Button.tsx']).toMatchObject({
        totalCommits: 5,
        lastModified: expect.any(String),
        changeFrequency: expect.any(String),
        fileStats: {
          size: 1024,
          exists: true
        }
      });
    });
  });

  describe('File Analysis', () => {
    it('should identify file types correctly', () => {
      expect(service.getFileType('app.js')).toBe('javascript');
      expect(service.getFileType('component.tsx')).toBe('react');
      expect(service.getFileType('styles.css')).toBe('css');
      expect(service.getFileType('README.md')).toBe('documentation');
      expect(service.getFileType('package.json')).toBe('config');
      expect(service.getFileType('script.sh')).toBe('script');
      expect(service.getFileType('unknown.xyz')).toBe('other');
    });

    it('should group files by type', () => {
      const files = [
        { path: 'app.js', type: 'javascript' },
        { path: 'component.tsx', type: 'react' },
        { path: 'styles.css', type: 'css' },
        { path: 'another.js', type: 'javascript' }
      ];

      const grouped = service.groupFilesByType(files);

      expect(grouped.javascript).toHaveLength(2);
      expect(grouped.react).toHaveLength(1);
      expect(grouped.css).toHaveLength(1);
    });

    it('should identify hotspots correctly', () => {
      const changedFiles = {
        mostActive: [
          { path: 'hotfile1.js', commits: [1, 2, 3, 4, 5, 6], totalChanges: 100 },
          { path: 'hotfile2.js', commits: [1, 2, 3, 4], totalChanges: 50 },
          { path: 'normalfile.js', commits: [1, 2], totalChanges: 20 }
        ]
      };

      const hotspots = service.identifyHotspots(changedFiles);

      expect(hotspots).toHaveLength(2); // Only files with >2 commits
      expect(hotspots[0]).toMatchObject({
        path: 'hotfile1.js',
        changeCount: 6,
        riskLevel: 'high'
      });
      expect(hotspots[1]).toMatchObject({
        path: 'hotfile2.js',
        changeCount: 4,
        riskLevel: 'medium'
      });
    });
  });

  describe('Pattern Analysis', () => {
    it('should extract meaningful keywords', () => {
      const keywords = service.extractCommitKeywords('Add new user authentication system with JWT tokens');
      
      expect(keywords).toContain('user');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('system');
      expect(keywords).toContain('tokens');
      expect(keywords).not.toContain('new'); // Should filter common words
      expect(keywords).not.toContain('with'); // Should filter common words
      expect(keywords.length).toBeLessThanOrEqual(5); // Should limit to 5 keywords
    });

    it('should assess commit impact correctly', () => {
      const highImpact = {
        insertions: 300,
        deletions: 200,
        files: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // 10 files
      };
      expect(service.assessCommitImpact(highImpact)).toBe('high');

      const mediumImpact = {
        insertions: 80,
        deletions: 20,
        files: [1, 2, 3] // 3 files
      };
      expect(service.assessCommitImpact(mediumImpact)).toBe('medium');

      const lowImpact = {
        insertions: 5,
        deletions: 2,
        files: [1] // 1 file
      };
      expect(service.assessCommitImpact(lowImpact)).toBe('low');
    });

    it('should calculate commits per day', () => {
      const commits = [1, 2, 3, 4, 5]; // 5 commits
      const dayRange = 2; // 2 days
      
      const perDay = service.calculateCommitsPerDay(commits, dayRange);
      
      expect(perDay).toBe(2.5); // 5 commits / 2 days = 2.5
    });

    it('should count active development days', () => {
      const commits = [
        { date: '2023-01-01T10:00:00Z' },
        { date: '2023-01-01T15:00:00Z' }, // Same day
        { date: '2023-01-02T10:00:00Z' },
        { date: '2023-01-03T10:00:00Z' }
      ];

      const activeDays = service.getActiveDays(commits);
      
      expect(activeDays).toBe(3); // 3 unique days
    });
  });

  describe('Change Frequency Analysis', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-02-01T00:00:00Z').getTime());
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it('should calculate very high frequency', () => {
      const commits = Array(15).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() // 15 commits in last 15 days
      }));

      const frequency = service.calculateChangeFrequency(commits);
      expect(frequency).toBe('very-high');
    });

    it('should calculate high frequency', () => {
      const commits = Array(8).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() // 8 commits in last 8 days
      }));

      const frequency = service.calculateChangeFrequency(commits);
      expect(frequency).toBe('high');
    });

    it('should calculate medium frequency', () => {
      const commits = Array(3).fill().map((_, i) => ({
        date: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString() // 3 commits in last 21 days
      }));

      const frequency = service.calculateChangeFrequency(commits);
      expect(frequency).toBe('medium');
    });

    it('should calculate low frequency', () => {
      const commits = [
        { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() } // 1 commit 10 days ago
      ];

      const frequency = service.calculateChangeFrequency(commits);
      expect(frequency).toBe('low');
    });

    it('should return none for no recent commits', () => {
      const commits = [
        { date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() } // 1 commit 40 days ago
      ];

      const frequency = service.calculateChangeFrequency(commits);
      expect(frequency).toBe('none');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle git log errors', async () => {
      mockGit.log.mockRejectedValue(new Error('Git log failed'));

      await expect(service.analyzeRecentActivity()).rejects.toThrow('Failed to analyze recent activity: Git log failed');
    });

    it('should handle branch status errors', async () => {
      mockGit.log.mockResolvedValue({ all: [] });
      mockGit.branch.mockRejectedValue(new Error('Branch error'));

      await expect(service.analyzeRecentActivity()).rejects.toThrow('Failed to analyze recent activity: Branch error');
    });

    it('should handle path analysis errors', async () => {
      mockGit.log.mockRejectedValue(new Error('Path log failed'));

      await expect(service.analyzePathChanges(['test.js'])).rejects.toThrow('Failed to analyze path changes: Path log failed');
    });
  });

  describe('Service Status', () => {
    it('should return correct status before initialization', () => {
      const status = service.getStatus();

      expect(status).toEqual({
        initialized: false,
        projectRoot: '/test/project',
        timeRange: 7,
        maxCommits: 50
      });
    });

    it('should return correct status after initialization', async () => {
      await service.initialize();
      const status = service.getStatus();

      expect(status).toEqual({
        initialized: true,
        projectRoot: '/test/project',
        timeRange: 7,
        maxCommits: 50
      });
    });
  });
});