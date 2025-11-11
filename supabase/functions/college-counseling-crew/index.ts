import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// API Keys
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');

interface StudentProfile {
  gpa?: number;
  sat?: number;
  act?: number;
  extracurriculars?: string[];
  interests?: string[];
  targetMajor?: string;
  location?: string;
  [key: string]: any;
}

interface CrewTask {
  name: string;
  agent: string;
  description: string;
  context?: any;
  output?: string;
}

// RAG System: Internal Knowledge Search
async function searchInternalKnowledge(query: string): Promise<string> {
  // Simulated RAG - In production, this would query a vector database
  const knowledgeBase = {
    platform_features: "Admit AI Nexus provides comprehensive college counseling with multi-channel outreach (email, SMS, WhatsApp, voice), AI-powered campaign automation, personalized student profile analysis, and data-driven college list generation.",
    methodology: "We use a holistic approach analyzing academic performance, extracurricular activities, personal interests, and demographic factors to create strategic admission narratives and balanced college lists.",
    analysis_framework: "Our analysis considers GPA, standardized test scores, extracurricular depth, leadership experience, essay quality, and demonstrated interest to assess student competitiveness."
  };

  let context = "";
  for (const [key, value] of Object.entries(knowledgeBase)) {
    if (query.toLowerCase().includes(key.replace(/_/g, ' '))) {
      context += value + " ";
    }
  }

  return context || "General platform knowledge: Admit AI Nexus specializes in personalized college counseling using AI-driven insights and multi-agent automation.";
}

// External Tool: Tavily Web Search
async function tavilySearch(query: string): Promise<string> {
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        max_results: 3,
      }),
    });

    const data = await response.json();
    const results = data.results?.map((r: any) => `${r.title}: ${r.content}`).join('\n') || '';
    return results || 'No results found';
  } catch (error) {
    console.error('Tavily search error:', error);
    return 'Search temporarily unavailable';
  }
}

// External Tool: Serper Search (for structured college data)
async function serperSearch(query: string): Promise<string> {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 5,
      }),
    });

    const data = await response.json();
    const organic = data.organic || [];
    const results = organic.map((r: any) => `${r.title}: ${r.snippet}`).join('\n');
    return results || 'No results found';
  } catch (error) {
    console.error('Serper search error:', error);
    return 'Search temporarily unavailable';
  }
}

// AI Assistant using Lovable AI
async function callAI(systemPrompt: string, userPrompt: string, context?: string): Promise<string> {
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: "system", content: `Context: ${context}` });
  }

  messages.push({ role: "user", content: userPrompt });

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI call error:', error);
    throw error;
  }
}

// AGENT 1: College Profile Analyst
async function collegeProfileAnalyst(profile: StudentProfile): Promise<string> {
  console.log('🎓 College Profile Analyst: Starting analysis...');
  
  const internalContext = await searchInternalKnowledge("student profile analysis framework methodology");
  const webContext = await tavilySearch("college admission profile evaluation best practices 2025");

  const systemPrompt = `You are a seasoned college admissions counselor specializing in deep student profile analysis. 
Your expertise includes identifying strengths, weaknesses, and crafting strategic admission narratives.
Analyze the student comprehensively and provide actionable insights.`;

  const userPrompt = `Analyze this student profile in detail and create a strategic narrative:
${JSON.stringify(profile, null, 2)}

Provide:
1. Academic Strengths & Weaknesses
2. Extracurricular Profile Assessment
3. Competitive Positioning
4. Strategic Narrative & Unique Selling Points
5. Areas for Improvement

Output should be approximately 500 words.`;

  const analysis = await callAI(systemPrompt, userPrompt, internalContext + '\n' + webContext);
  console.log('✅ Profile analysis completed');
  return analysis;
}

// AGENT 2: College Matchmaking Specialist
async function collegeMatchmakingSpecialist(profileAnalysis: string, profile: StudentProfile): Promise<string> {
  console.log('🎯 College Matchmaking Specialist: Generating college list...');

  const internalContext = await searchInternalKnowledge("college matchmaking platform features");
  
  // Use Serper for real-time college data
  const searchQuery = `best colleges for ${profile.targetMajor || 'undecided'} major ${profile.location || ''} admission rates 2025`;
  const collegeData = await serperSearch(searchQuery);

  const systemPrompt = `You are an expert college matchmaking specialist with deep knowledge of university trends, admission statistics, and program alignments.
You create balanced, strategic college lists (Reach, Target, Safety) based on student profiles and current data.`;

  const userPrompt = `Based on this profile analysis:
${profileAnalysis}

And this real-time college data:
${collegeData}

Create a personalized college list with:
1. 3-4 Reach Schools (explanation of why each is a reach but viable)
2. 4-5 Target Schools (strong fit with realistic admission chances)
3. 2-3 Safety Schools (highly likely admission with good programs)

For each college include:
- Name and location
- Why it fits the student's profile
- Key programs/opportunities
- Admission statistics
- Strategic application tips`;

  const collegeList = await callAI(systemPrompt, userPrompt, internalContext);
  console.log('✅ College list generated');
  return collegeList;
}

// AGENT 3: Strategic Dashboard Analyst
async function strategicDashboardAnalyst(userId: string): Promise<string> {
  console.log('📊 Strategic Dashboard Analyst: Analyzing trends...');

  // Fetch user's campaigns and candidates
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, candidates(*)')
    .eq('user_id', userId);

  const { data: analytics } = await supabase
    .from('campaign_analytics')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  const internalContext = await searchInternalKnowledge("dashboard data analysis business strategy");

  const systemPrompt = `You are a data scientist focused on system optimization and strategic insights.
Convert raw campaign data into actionable business intelligence.`;

  const userPrompt = `Analyze this campaign data and provide strategic insights:
Campaigns: ${JSON.stringify(campaigns?.slice(0, 5))}
Recent Analytics: ${JSON.stringify(analytics?.slice(0, 20))}

Provide:
1. Key Performance Trends
2. Popular college choices
3. Common pain points
4. Engagement patterns
5. Strategic recommendations for improvement`;

  const insights = await callAI(systemPrompt, userPrompt, internalContext);
  console.log('✅ Dashboard analysis completed');
  return insights;
}

// AGENT 4: Campaign Operations Executive
async function campaignOperationsExecutive(strategyReport: string, userId: string): Promise<string> {
  console.log('📧 Campaign Operations Executive: Planning campaigns...');

  const internalContext = await searchInternalKnowledge("campaign automation multi-channel outreach");

  const systemPrompt = `You are an expert in marketing automation and multi-channel communication strategy.
Design effective, targeted outreach campaigns based on data-driven insights.`;

  const userPrompt = `Based on this strategic report:
${strategyReport}

Design an automated campaign strategy that includes:
1. Campaign objectives
2. Target audience segmentation
3. Channel selection (Email/SMS/WhatsApp/Voice) with reasoning
4. Message templates for each channel
5. Timing and frequency recommendations
6. Success metrics to track

Be specific and actionable.`;

  const campaignPlan = await callAI(systemPrompt, userPrompt, internalContext);
  console.log('✅ Campaign strategy generated');
  return campaignPlan;
}

// Crew Orchestrator
async function runPersonalizedCounselingCrew(profile: StudentProfile) {
  const tasks: CrewTask[] = [
    {
      name: "Profile_Assessment",
      agent: "College Profile Analyst",
      description: "Analyze student profile and create strategic narrative",
      context: profile,
    },
    {
      name: "College_List_Generation",
      agent: "College Matchmaking Specialist",
      description: "Generate personalized college list",
      context: null, // Will be populated from previous task
    },
  ];

  // Execute tasks sequentially
  const profileAnalysis = await collegeProfileAnalyst(profile);
  tasks[0].output = profileAnalysis;

  const collegeList = await collegeMatchmakingSpecialist(profileAnalysis, profile);
  tasks[1].output = collegeList;

  return {
    crew: "Personalized_Counseling_Crew",
    tasks: tasks,
    finalOutput: collegeList,
    profileAnalysis: profileAnalysis,
  };
}

async function runAutomatedOperationsCrew(userId: string) {
  const tasks: CrewTask[] = [
    {
      name: "Data_Trend_Analysis",
      agent: "Strategic Dashboard Analyst",
      description: "Analyze campaign data for trends and insights",
      context: { userId },
    },
    {
      name: "Targeted_Campaign_Launch",
      agent: "Campaign Operations Executive",
      description: "Design targeted campaign strategy",
      context: null,
    },
  ];

  // Execute tasks sequentially
  const trendAnalysis = await strategicDashboardAnalyst(userId);
  tasks[0].output = trendAnalysis;

  const campaignStrategy = await campaignOperationsExecutive(trendAnalysis, userId);
  tasks[1].output = campaignStrategy;

  return {
    crew: "Automated_Operations_Crew",
    tasks: tasks,
    finalOutput: campaignStrategy,
    trendAnalysis: trendAnalysis,
  };
}

// Format output with branding
function formatOutputWithBranding(crewOutput: any): string {
  return `# Admit AI Nexus Report
---

## ${crewOutput.crew}

${crewOutput.finalOutput}

---

### Detailed Agent Outputs

${crewOutput.tasks.map((task: CrewTask) => `
#### ${task.name} (${task.agent})
${task.output}
`).join('\n')}

---

*Powered by Yash Sharma, Generative AI Engineer*
*Providing personalized college counseling at scale with advanced multi-agent systems leveraging RAG and real-time data integrity.*
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { crewType, profile, userId } = await req.json();

    console.log(`🚀 Starting ${crewType} crew execution...`);

    let result;

    if (crewType === 'counseling') {
      if (!profile) {
        throw new Error('Student profile is required for counseling crew');
      }
      result = await runPersonalizedCounselingCrew(profile);
    } else if (crewType === 'operations') {
      if (!userId) {
        throw new Error('User ID is required for operations crew');
      }
      result = await runAutomatedOperationsCrew(userId);
    } else {
      throw new Error('Invalid crew type. Use "counseling" or "operations"');
    }

    const formattedOutput = formatOutputWithBranding(result);

    console.log('✅ Crew execution completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        output: formattedOutput,
        rawData: result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in college-counseling-crew:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
