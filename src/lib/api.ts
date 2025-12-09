import { supabase } from "@/integrations/supabase/client";

// Base URL for the Python backend
const API_BASE_URL = 'http://localhost:8000/api';

export const api = {
    campaigns: {
        create: async (userId: string, name: string, instructions: string) => {
            const response = await fetch(`${API_BASE_URL}/campaigns/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: userId, name: name, goal: instructions }),
            });

            if (!response.ok) {
                throw new Error('Failed to create campaign via AI Agent');
            }

            return response.json();
        },

        execute: async (campaignId: string) => {
            const response = await fetch(`${API_BASE_URL}/campaigns/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ campaign_id: campaignId }),
            });

            if (!response.ok) {
                throw new Error('Failed to execute campaign');
            }

            return response.json();
        },

        delete: async (campaignId: string) => {
            const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete campaign context');
            }

            return response.json();
        }
    },

    candidates: {
        upload: async (formData: FormData) => {
            const response = await fetch(`${API_BASE_URL}/candidates/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to upload candidates');
            }

            return response.json();
        },

        uploadBatch: async (userId: string, candidates: any[], campaignId?: string) => {
            const body = {
                user_id: userId,
                candidates: candidates,
                campaign_id: campaignId // Optional
            };

            const response = await fetch(`${API_BASE_URL}/candidates/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to batch upload candidates');
            }

            return response.json();
        }
    },

    analytics: {
        get: async (campaignId?: string) => {
            const url = campaignId
                ? `${API_BASE_URL}/analytics?campaign_id=${campaignId}`
                : `${API_BASE_URL}/analytics`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch analytics');
            return response.json();
        }
    },

    contact: {
        submit: async (name: string, email: string, message: string) => {
            const response = await fetch(`${API_BASE_URL}/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, message }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to send message');
            }

            return response.json();
        }
    }
};
