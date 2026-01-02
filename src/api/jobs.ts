import {apiGet, apiPost} from './client';

export type ActiveJob = {
  id: string;
  vehicleNumber: string;
  tagNumber: string;
  customerPhone?: string;
  locationName: string;
  locationDescription?: string;
  slotOrZone: string;
  parkedAt: string;
  hasPhotos: boolean;
  photoCount: number;
  parkedDurationMinutes: number;
  isOverdue: boolean;
};

export type ActiveJobsResponse = {
  jobs: ActiveJob[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  summary: {
    totalJobs: number;
    jobsWithPhotos: number;
    jobsWithoutPhotos: number;
  };
};

export type JobStatsResponse = {
  activeJobsCount: number;
  jobsRequiringPhotos: number;
  overdueJobs: number;
  lastUpdated: string;
};

export async function getActiveJobs(limit = 50, offset = 0) {
  return apiGet<ActiveJobsResponse>(
    `/api/v1/jobs/active?limit=${limit}&offset=${offset}`,
    true,
  );
}

export async function searchJobs(q: string, limit = 20) {
  const encoded = encodeURIComponent(q);
  return apiGet<unknown>(`/api/v1/jobs/search?q=${encoded}&limit=${limit}`, true);
}

export async function getJobsStats() {
  return apiGet<JobStatsResponse>('/api/v1/jobs/stats', true);
}

export async function getJobDetails(jobId: string) {
  return apiGet<unknown>(`/api/v1/jobs/${jobId}`, true);
}

export async function acceptJob(jobId: string) {
  console.log('[JobsApi] Accepting job', {jobId});
  return apiPost<unknown>(`/api/v1/jobs/${jobId}/accept`, {}, true);
}

export async function declineJob(jobId: string, reason: string) {
  console.log('[JobsApi] Declining job', {jobId, reason});
  return apiPost<unknown>(`/api/v1/jobs/${jobId}/decline`, {reason}, true);
}

export type CompletedJob = {
  id: string;
  bookingId: string;
  parkingJobId: string;
  vehicleNumber: string;
  tagNumber: string;
  customerPhone: string;
  bookingStatus: string;
  slotOrZone: string;
  locationDescription: string;
  duration: string;
  receiptPrinted: boolean;
};

export type CompletedJobsResponse = {
  success: boolean;
  count: number;
  data: CompletedJob[];
};

export async function getCompletedJobs(limit = 50, offset = 0) {
  return apiGet<CompletedJobsResponse>(
    `/api/v1/jobs/completed-all?limit=${limit}&offset=${offset}`,
    true,
  );
}
