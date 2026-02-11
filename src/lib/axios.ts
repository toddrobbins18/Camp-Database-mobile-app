import axios from 'axios';
import { supabase } from './supabase';

const API_URL = 'https://gdcxtefbarvnrtvacqln.supabase.co/functions/v1';

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
});

export default axiosInstance;
