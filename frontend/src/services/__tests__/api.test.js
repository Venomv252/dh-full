// Simple test for API service layer
import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { authAPI, userAPI, incidentAPI } from '../api.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('API Service Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock axios.create
    mockedAxios.create.mockReturnValue({
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    });
  });

  describe('authAPI', () => {
    it('should handle login correctly', async () => {
      const mockResponse = {
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', role: 'user' },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = await authAPI.login(credentials, 'user');

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe('test@example.com');
    });

    it('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      mockError.response = {
        status: 401,
        data: { message: 'Invalid credentials' },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockRejectedValue(mockError);

      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const result = await authAPI.login(credentials, 'user');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });
  });

  describe('userAPI', () => {
    it('should get user profile', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: '1',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await userAPI.getProfile();

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@example.com');
    });
  });

  describe('incidentAPI', () => {
    it('should create incident', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: '1',
          title: 'Test Incident',
          status: 'reported',
        },
      };

      const mockAxiosInstance = mockedAxios.create();
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const incidentData = {
        title: 'Test Incident',
        description: 'Test description',
        location: { lat: 40.7128, lng: -74.0060 },
      };

      const result = await incidentAPI.create(incidentData);

      expect(result.success).toBe(true);
      expect(result.data.title).toBe('Test Incident');
    });
  });
});