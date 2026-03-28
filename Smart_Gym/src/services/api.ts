const API_BASE_URL = 'http://localhost:5000/api';

export interface User {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  userType: 'user' | 'trainer';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  userType: 'user' | 'trainer';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface Workout {
  _id: string;
  name: string;
  type: string;
  duration: number;
  caloriesBurned: number;
  exercises: Array<{
    name: string;
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
  }>;
  notes?: string;
  completedAt: string;
  status: string;
}

export interface Goal {
  _id: string;
  type: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  period: string;
}

export interface UserDashboardData {
  user: {
    name: string;
    email: string;
    profile: any;
    stats: any;
  };
  weeklyStats: {
    workoutSessions: number;
    totalMinutes: number;
    totalCalories: number;
  };
  lastWeekStats?: {
    workoutSessions: number;
    totalMinutes: number;
    totalCalories: number;
  };
  monthlyStats?: {
    workoutSessions: number;
    totalMinutes: number;
    totalCalories: number;
  };
  comparisons?: {
    workouts: number;
    minutes: number;
    calories: number;
  };
  currentStreak: number;
  longestStreak?: number;
  avgWorkoutDuration?: number;
  avgWorkoutsPerWeek?: number;
  activeGoals: Goal[];
  recentWorkouts: Workout[];
  weeklyActivityData?: Array<{
    day: string;
    date: string;
    workouts: number;
    calories: number;
    minutes: number;
  }>;
  monthlyProgressData?: Array<{
    week: string;
    weekStart: string;
    weekEnd: string;
    workouts: number;
    calories: number;
    minutes: number;
  }>;
  workoutTypeDistribution?: Array<{
    name: string;
    value: number;
    count: number;
    color: string;
  }>;
}

export interface TrainerDashboardData {
  trainer: {
    name: string;
    email: string;
    trainerProfile: any;
  };
  stats: {
    activeClients: number;
    monthlyEarnings: number;
    todayEarnings: number;
    todaySessions: number;
    rating: number;
  };
  todaySessions: any[];
  activeClients: any[];
}

class ApiService {
  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user data');
    }

    return response.json();
  }

  async getUserDashboard(): Promise<UserDashboardData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/user`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user dashboard data');
    }

    return response.json();
  }

  async getTrainerDashboard(): Promise<TrainerDashboardData> {
    const response = await fetch(`${API_BASE_URL}/dashboard/trainer`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get trainer dashboard data');
    }

    return response.json();
  }

  async logWorkout(workoutData: {
    name: string;
    type: string;
    duration: number;
    caloriesBurned: number;
    exercises?: any[];
    notes?: string;
  }): Promise<{ message: string; workout: Workout }> {
    const response = await fetch(`${API_BASE_URL}/dashboard/workout`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to log workout');
    }

    return response.json();
  }

  async updateGoals(goals: Array<{
    type: string;
    title: string;
    targetValue: number;
    unit: string;
    period: string;
  }>): Promise<{ message: string; goals: Goal[] }> {
    const response = await fetch(`${API_BASE_URL}/dashboard/goals`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ goals }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update goals');
    }

    return response.json();
  }

  async getWorkoutAnalytics(period: number = 30): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/analytics?period=${period}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get workout analytics');
    }

    return response.json();
  }

  async getWorkoutHistory(params: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.type) queryParams.append('type', params.type);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await fetch(`${API_BASE_URL}/dashboard/workouts?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get workout history');
    }

    return response.json();
  }

  async updateWorkout(workoutId: string, updates: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/workout/${workoutId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update workout');
    }

    return response.json();
  }

  async deleteWorkout(workoutId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dashboard/workout/${workoutId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete workout');
    }

    return response.json();
  }

  // Chat API methods
  async getConversations(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get conversations');
    }

    return response.json();
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get messages');
    }

    return response.json();
  }

  async startConversation(receiverId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ receiverId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start conversation');
    }

    return response.json();
  }

  async getAvailableUsers(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/chat/users`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get available users');
    }

    return response.json();
  }

  async getOnlineUsers(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/chat/online-users`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get online users');
    }

    return response.json();
  }

  // Payment API methods
  async createSessionPayment(sessionId: string, amount: number, trainerId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/session`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ sessionId, amount, trainerId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create payment');
    }

    return response.json();
  }

  async createSubscription(priceId: string, planName: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/subscription`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ priceId, planName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create subscription');
    }

    return response.json();
  }

  async getPaymentHistory(page: number = 1, limit: number = 10): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/history?page=${page}&limit=${limit}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get payment history');
    }

    return response.json();
  }

  async getUserSubscriptions(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/payment/subscriptions`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get subscriptions');
    }

    return response.json();
  }

  async cancelSubscription(subscriptionId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/subscriptions/${subscriptionId}/cancel`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }

    return response.json();
  }

  async getTrainerEarnings(startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/payment/earnings`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get trainer earnings');
    }

    return response.json();
  }

  // Exercise API methods
  async getExercises(params?: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    muscleGroups?: string[];
    equipment?: string[];
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/exercises?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get exercises');
    }

    return response.json();
  }

  async getExerciseById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get exercise');
    }

    return response.json();
  }

  async createExercise(exerciseData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(exerciseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create exercise');
    }

    return response.json();
  }

  async updateExercise(id: string, exerciseData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(exerciseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update exercise');
    }

    return response.json();
  }

  async deleteExercise(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete exercise');
    }

    return response.json();
  }

  async getExerciseFilters(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises/filters`);

    if (!response.ok) {
      throw new Error('Failed to get exercise filters');
    }

    return response.json();
  }

  async rateExercise(id: string, rating: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/exercises/${id}/rate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ rating }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to rate exercise');
    }

    return response.json();
  }

  async getPopularExercises(limit?: number): Promise<any> {
    const url = limit ? `${API_BASE_URL}/exercises/popular?limit=${limit}` : `${API_BASE_URL}/exercises/popular`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to get popular exercises');
    }

    return response.json();
  }

  // Workout Plan API methods
  async getWorkoutPlans(params?: {
    page?: number;
    limit?: number;
    category?: string;
    difficulty?: string;
    duration?: string;
    equipment?: string[];
    search?: string;
    sortBy?: string;
    sortOrder?: string;
    isPremium?: boolean;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/workouts?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get workout plans');
    }

    return response.json();
  }

  async getWorkoutPlanById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workouts/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get workout plan');
    }

    return response.json();
  }

  async createWorkoutPlan(workoutData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workouts`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create workout plan');
    }

    return response.json();
  }

  async enrollInWorkoutPlan(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workouts/${id}/enroll`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to enroll in workout plan');
    }

    return response.json();
  }

  async getUserWorkoutPlans(status?: string): Promise<any> {
    const url = status ? `${API_BASE_URL}/workouts/user/plans?status=${status}` : `${API_BASE_URL}/workouts/user/plans`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get user workout plans');
    }

    return response.json();
  }

  async logWorkoutCompletion(progressId: string, workoutData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workouts/progress/${progressId}/complete`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(workoutData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to log workout completion');
    }

    return response.json();
  }

  async getWorkoutPlanFilters(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workouts/filters`);

    if (!response.ok) {
      throw new Error('Failed to get workout plan filters');
    }

    return response.json();
  }

  async getPopularWorkoutPlans(limit?: number): Promise<any> {
    const url = limit ? `${API_BASE_URL}/workouts/popular?limit=${limit}` : `${API_BASE_URL}/workouts/popular`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to get popular workout plans');
    }

    return response.json();
  }
}

export const apiService = new ApiService();


  // Payment Methods
  async getPaymentMethods(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/methods`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get payment methods');
    }

    return response.json();
  }

  async addPaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/methods`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ paymentMethodId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add payment method');
    }

    return response.json();
  }

  async removePaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove payment method');
    }

    return response.json();
  }

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/methods/default`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ paymentMethodId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to set default payment method');
    }

    return response.json();
  }

  // Invoice Generation
  async generateInvoice(paymentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/invoice/${paymentId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate invoice');
    }

    return response.json();
  }

  async downloadInvoice(filename: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/payment/invoice/download/${filename}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }

    return response.blob();
  }

  // Payment Statistics
  async getPaymentStatistics(startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/payment/statistics`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to get payment statistics');
    }

    return response.json();
  }

  // Payment Verification
  async verifyPaymentStatus(paymentIntentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/payment/verify/${paymentIntentId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment status');
    }

    return response.json();
  }
