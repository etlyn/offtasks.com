import { createWebsiteAnalytics } from '@etlyn/analytics/website';
import { screenForPath } from './analytics-routes';
// Staging builds never register analytics, whatever key the environment carries.
const applicationKey=import.meta.env.VITE_STAGING?'':import.meta.env.VITE_ANALYTICS_APPLICATION_KEY;
const analytics=createWebsiteAnalytics({applicationKey,apiBaseUrl:import.meta.env.VITE_ANALYTICS_API_URL || 'https://api.etlyn.com',appVersion:'offtasks-landing-1',screenForPath,clickTargets:['download_ios','open_planner']});
export const {start:startAnalytics,readEnabled:readAnalyticsEnabled,setEnabled:setAnalyticsEnabled,privacySignalActive,configured:analyticsConfigured,recordConversion}=analytics;
