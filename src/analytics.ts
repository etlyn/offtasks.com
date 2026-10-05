import { createWebsiteAnalytics } from '@etlyn/analytics/website';
import { screenForPath } from './analytics-routes';
const analytics=createWebsiteAnalytics({applicationKey:import.meta.env.VITE_ANALYTICS_APPLICATION_KEY,apiBaseUrl:import.meta.env.VITE_ANALYTICS_API_URL || 'https://api.etlyn.com',appVersion:'offtasks-landing-1',screenForPath,clickTargets:['download_ios','open_planner']});
export const {start:startAnalytics,readEnabled:readAnalyticsEnabled,setEnabled:setAnalyticsEnabled,privacySignalActive,configured:analyticsConfigured,recordConversion}=analytics;
