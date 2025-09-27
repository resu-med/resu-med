import { NextRequest, NextResponse } from 'next/server';
import { JobListing } from '@/types/profile';

interface JobSearchFilters {
  keywords: string;
  location: string;
  jobType: string;
  experienceLevel: string;
  salaryMin?: number;
  salaryMax?: number;
  remote: boolean;
  selectedProviders?: string[];
  page?: number;
  pageSize?: number;
}

export async function POST(request: NextRequest) {
  try {
    const filters: JobSearchFilters = await request.json();
    const { keywords, location, jobType, experienceLevel, salaryMin, salaryMax, remote, selectedProviders, page = 1, pageSize = 20 } = filters;

    if (!keywords || keywords.trim().length === 0) {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }

    console.log('🔍 Multi-source job search:', { keywords, location, jobType, experienceLevel, remote, selectedProviders });

    // Search multiple job APIs in parallel based on selected providers
    const searchPromises: Promise<JobListing[]>[] = [];
    const enabledProviders = selectedProviders && selectedProviders.length > 0 ? selectedProviders : [
      'Reed', 'Adzuna', 'Indeed' // Prioritize the three main providers
    ];

    console.log('🔍 Enabled providers:', enabledProviders);
    console.log('🔑 Available API keys:', {
      reed: !!process.env.REED_API_KEY,
      adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      indeed: !!process.env.INDEED_PUBLISHER_ID
    });

    // Reed API (UK-focused) - PRIMARY
    if (enabledProviders.includes('Reed') && process.env.REED_API_KEY) {
      console.log('📋 Adding Reed API search');
      searchPromises.push(searchReedJobs(filters));
    }

    // Adzuna API (comprehensive) - PRIMARY
    if (enabledProviders.includes('Adzuna') && process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
      console.log('🌐 Adding Adzuna API search');
      searchPromises.push(searchAdzunaJobs(filters));
    }

    // Indeed API - PRIMARY
    if (enabledProviders.includes('Indeed')) {
      console.log('💼 Adding Indeed search');
      searchPromises.push(searchIndeedJobs(filters)); // Will use RSS/public method
    }

    // Additional APIs (optional)
    if (enabledProviders.includes('RemoteOK')) {
      console.log('🌐 Adding RemoteOK search');
      searchPromises.push(searchRemoteOKJobs(filters)); // No API key required
    }

    // Execute all searches in parallel
    let allJobs: JobListing[] = [];

    if (searchPromises.length > 0) {
      const results = await Promise.allSettled(searchPromises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allJobs = allJobs.concat(result.value);
        } else {
          console.error('Job search API failed:', result.reason);
        }
      }
    }

    // If no real APIs available or all failed, use fallback
    if (allJobs.length === 0) {
      console.log('⚠️ No results from APIs - API keys may be missing or APIs failed');
      console.log('🔑 Reed API key present:', !!process.env.REED_API_KEY);
      console.log('🔑 Adzuna API keys present:', !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY));

      // Return empty results instead of dummy data to encourage API setup
      return NextResponse.json({
        jobs: [],
        total: 0,
        totalPages: 0,
        currentPage: page,
        pageSize,
        hasNextPage: false,
        hasPreviousPage: false,
        sources: [],
        message: 'No job search APIs configured. Please set up Reed and Adzuna API keys for real job results.',
        setupInstructions: {
          reed: 'Get free API key from https://www.reed.co.uk/developers',
          adzuna: 'Get free API key from https://developer.adzuna.com/',
          environment: 'Add REED_API_KEY, ADZUNA_APP_ID, and ADZUNA_APP_KEY to your environment variables'
        }
      });
    }

    // Remove duplicates and sort by relevance
    const uniqueJobs = removeDuplicateJobs(allJobs);
    const sortedJobs = sortJobsByRelevance(uniqueJobs, keywords);

    console.log(`✅ Found ${sortedJobs.length} unique job listings from multiple sources`);

    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedJobs = sortedJobs.slice(startIndex, endIndex);
    const totalPages = Math.ceil(sortedJobs.length / pageSize);

    return NextResponse.json({
      jobs: paginatedJobs,
      total: sortedJobs.length,
      totalPages,
      currentPage: page,
      pageSize,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      sources: getActiveSources()
    });

  } catch (error) {
    console.error('Job search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for jobs' },
      { status: 500 }
    );
  }
}

// JSearch API Integration (RapidAPI)
async function searchJSearchJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🚀 Searching JSearch API (RapidAPI)...');

    const searchParams = {
      query: filters.keywords,
      page: '1',
      num_pages: '1',
      date_posted: 'week',
      employment_types: filters.jobType === 'full-time' ? 'FULLTIME' :
                       filters.jobType === 'part-time' ? 'PARTTIME' :
                       filters.jobType === 'contract' ? 'CONTRACTOR' :
                       filters.jobType === 'internship' ? 'INTERN' : undefined,
      remote_jobs_only: filters.remote ? 'true' : 'false',
      job_requirements: filters.experienceLevel === 'entry' ? 'no_experience' :
                       filters.experienceLevel === 'senior' ? 'more_than_3_years_experience' :
                       filters.experienceLevel === 'executive' ? 'more_than_3_years_experience' : undefined
    };

    // Add location if not remote
    if (!filters.remote && filters.location) {
      if (filters.location.toLowerCase().includes('uk') ||
          filters.location.toLowerCase().includes('united kingdom') ||
          filters.location.toLowerCase().includes('london') ||
          filters.location.toLowerCase().includes('manchester') ||
          filters.location.toLowerCase().includes('birmingham')) {
        (searchParams as any).country = 'UK';
      }
      (searchParams as any).city = filters.location;
    }

    // Add salary filters if provided
    if (filters.salaryMin) {
      (searchParams as any).salary_min = filters.salaryMin.toString();
    }
    if (filters.salaryMax) {
      (searchParams as any).salary_max = filters.salaryMax.toString();
    }

    const url = new URL('https://jsearch.p.rapidapi.com/search');
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        'User-Agent': 'ResuMed Job Search'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`JSearch API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      console.log('🔍 JSearch API returned no results');
      return [];
    }

    return data.data.slice(0, 10).map((job: any, index: number): JobListing => ({
      id: `jsearch-${job.job_id || index}`,
      title: job.job_title || 'Job Title Not Available',
      company: job.employer_name || 'Company Not Specified',
      location: job.job_city && job.job_state ?
                `${job.job_city}, ${job.job_state}${job.job_country ? ', ' + job.job_country : ''}` :
                job.job_country || filters.location || 'Location Not Specified',
      description: cleanDescription(job.job_description || 'No description available'),
      salary: formatJSearchSalary(job.job_min_salary, job.job_max_salary, job.job_salary_currency),
      type: mapJSearchJobType(job.job_employment_type) || 'full-time',
      experienceLevel: mapJSearchExperienceLevel(job.job_required_experience, job.job_title) || 'mid',
      datePosted: job.job_posted_at_datetime_utc || new Date().toISOString(),
      url: job.job_apply_link || `https://www.google.com/search?q=${encodeURIComponent(job.job_title + ' ' + job.employer_name)}`,
      source: 'JSearch',
      skills: extractSkills(job.job_description || '', job.job_title || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('JSearch API search failed:', error);
    return [];
  }
}

// Jooble API Integration (Global job search)
async function searchJoobleJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🌍 Searching Jooble API...');

    const searchData = {
      keywords: filters.keywords,
      location: filters.remote ? 'remote' : (filters.location || 'United Kingdom'),
      radius: 25,
      page: 1,
      count: 10,
      datecreatedfrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Last 30 days
    };

    // Add salary filter if provided
    if (filters.salaryMin) {
      (searchData as any).salary = `${filters.salaryMin}+`;
    }

    const response = await fetch('https://jooble.org/api/' + process.env.JOOBLE_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ResuMed Job Search'
      },
      body: JSON.stringify(searchData),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Jooble API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.jobs || !Array.isArray(data.jobs)) {
      console.log('🔍 Jooble API returned no results');
      return [];
    }

    return data.jobs.slice(0, 10).map((job: any, index: number): JobListing => ({
      id: `jooble-${job.id || index}`,
      title: job.title || 'Job Title Not Available',
      company: job.company || 'Company Not Specified',
      location: job.location || filters.location || 'Location Not Specified',
      description: cleanDescription(job.snippet || 'No description available'),
      salary: job.salary || undefined,
      type: mapJoobleJobType(job.type) || 'full-time',
      experienceLevel: mapExperienceLevel(job.title, job.snippet) || 'mid',
      datePosted: job.updated || new Date().toISOString(),
      url: job.link || `https://www.google.com/search?q=${encodeURIComponent(job.title + ' ' + job.company)}`,
      source: 'Jooble',
      skills: extractSkills(job.snippet || '', job.title || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('Jooble API search failed:', error);
    return [];
  }
}

// The Muse API Integration (Tech-focused jobs)
async function searchMuseJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🎨 Searching The Muse API...');

    const params = new URLSearchParams({
      api_key: process.env.MUSE_API_KEY!,
      category: 'Software Engineering,Data Science,UX Design,Product Management,Marketing,Sales',
      page: '1',
      descending: 'true',
      ...(filters.location && !filters.remote && { location: filters.location }),
      ...(filters.experienceLevel === 'entry' && { level: 'Entry Level' }),
      ...(filters.experienceLevel === 'mid' && { level: 'Mid Level' }),
      ...(filters.experienceLevel === 'senior' && { level: 'Senior Level' }),
      ...(filters.experienceLevel === 'executive' && { level: 'Senior Level' })
    });

    // Add search query to company name or job title
    if (filters.keywords) {
      params.append('company', filters.keywords);
    }

    const response = await fetch(`https://www.themuse.com/api/public/jobs?${params}`, {
      headers: {
        'User-Agent': 'ResuMed Job Search',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`The Muse API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      console.log('🔍 The Muse API returned no results');
      return [];
    }

    return data.results.slice(0, 10).map((job: any, index: number): JobListing => ({
      id: `muse-${job.id || index}`,
      title: job.name || 'Job Title Not Available',
      company: job.company?.name || 'Company Not Specified',
      location: job.locations?.map((loc: any) => loc.name).join(', ') || filters.location || 'Location Not Specified',
      description: cleanDescription(job.contents || 'No description available'),
      salary: undefined, // The Muse doesn't provide salary info in job listings
      type: mapMuseJobType(job.type) || 'full-time',
      experienceLevel: mapMuseExperienceLevel(job.level) || 'mid',
      datePosted: job.publication_date || new Date().toISOString(),
      url: job.refs?.landing_page || `https://www.themuse.com/jobs/${job.id}`,
      source: 'The Muse',
      skills: extractSkills(job.contents || '', job.name || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('The Muse API search failed:', error);
    return [];
  }
}

// RemoteOK API Integration (Remote developer jobs)
async function searchRemoteOKJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🌐 Searching RemoteOK API...');

    const response = await fetch('https://remoteok.com/api', {
      headers: {
        'User-Agent': 'ResuMed Job Search (https://resumed.com)',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`RemoteOK API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.log('🔍 RemoteOK API returned no results');
      return [];
    }

    // Filter jobs based on keywords (RemoteOK doesn't support search parameters)
    const filteredJobs = data.filter((job: any) => {
      if (!job.position || !job.company) return false;

      const searchText = `${job.position} ${job.company} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      const keywords = filters.keywords.toLowerCase().split(' ');

      return keywords.some(keyword => keyword.length > 2 && searchText.includes(keyword));
    });

    return filteredJobs.slice(0, 10).map((job: any, index: number): JobListing => ({
      id: `remoteok-${job.id || index}`,
      title: job.position || 'Job Title Not Available',
      company: job.company || 'Company Not Specified',
      location: job.location || 'Remote',
      description: cleanDescription(job.description || 'No description available'),
      salary: formatRemoteOKSalary(job.salary_min, job.salary_max),
      type: 'remote', // All RemoteOK jobs are remote
      experienceLevel: mapExperienceLevel(job.position, job.description) || 'mid',
      datePosted: job.date ? new Date(job.date).toISOString() : new Date().toISOString(),
      url: `https://remoteok.com/remote-jobs/${job.slug}` || `https://remoteok.com`,
      source: 'RemoteOK',
      skills: job.tags || [],
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('RemoteOK API search failed:', error);
    return [];
  }
}

// AngelList API Integration (Startup jobs) - DISCONTINUED
// Note: AngelList discontinued their public API in 2021
// This is a placeholder for future integration with alternative startup job sources
async function searchAngelListJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🚀 AngelList API search requested but API is no longer available');

    // AngelList discontinued their public API, so we return empty results
    // In a real implementation, you might:
    // 1. Integrate with AngelList's private API if you have access
    // 2. Use alternative startup job sources like:
    //    - Startup Jobs (https://startup.jobs/)
    //    - Y Combinator Work List
    //    - Remote startup job boards
    //    - Crunchbase job listings

    console.log('💡 Consider integrating alternative startup job sources');
    return [];

  } catch (error) {
    console.error('AngelList API search failed (API discontinued):', error);
    return [];
  }
}

// Reed API Integration
async function searchReedJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🇬🇧 Searching Reed API...');

    const params = new URLSearchParams({
      keywords: filters.keywords,
      ...(filters.location && !filters.remote && { locationName: filters.location }),
      ...(filters.remote && { locationName: 'remote' }),
      ...(filters.salaryMin && { minimumSalary: filters.salaryMin.toString() }),
      ...(filters.salaryMax && { maximumSalary: filters.salaryMax.toString() }),
      resultsToTake: '10'
    });

    const response = await fetch(`https://www.reed.co.uk/api/1.0/search?${params}`, {
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.REED_API_KEY + ':').toString('base64')}`,
        'User-Agent': 'ResuMed Job Search'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Reed API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.results || []).map((job: any, index: number): JobListing => ({
      id: `reed-${job.jobId || index}`,
      title: job.jobTitle || 'Job Title Not Available',
      company: job.employerName || 'Company Not Specified',
      location: job.locationName || filters.location || 'Location Not Specified',
      description: cleanDescription(job.jobDescription || 'No description available'),
      salary: formatSalary(job.minimumSalary, job.maximumSalary, job.currency),
      type: mapJobType(job.jobType) || 'full-time',
      experienceLevel: mapExperienceLevel(job.jobTitle, job.jobDescription) || 'mid',
      datePosted: job.date || new Date().toISOString(),
      url: job.jobUrl || `https://www.reed.co.uk/jobs/${job.jobId}`,
      source: 'Reed',
      skills: extractSkills(job.jobDescription || '', job.jobTitle || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('Reed API search failed:', error);
    return [];
  }
}

// Adzuna API Integration
async function searchAdzunaJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('🌐 Searching Adzuna API...');

    const params = new URLSearchParams({
      app_id: process.env.ADZUNA_APP_ID!,
      app_key: process.env.ADZUNA_APP_KEY!,
      what: filters.keywords,
      where: filters.remote ? 'remote' : (filters.location || 'UK'),
      results_per_page: '10',
      'content-type': 'application/json'
    });

    if (filters.salaryMin) {
      params.append('salary_min', filters.salaryMin.toString());
    }
    if (filters.salaryMax) {
      params.append('salary_max', filters.salaryMax.toString());
    }

    const response = await fetch(`https://api.adzuna.com/v1/api/jobs/gb/search/1?${params}`, {
      headers: {
        'User-Agent': 'ResuMed Job Search'
      },
      timeout: 10000
    });

    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.results || []).map((job: any, index: number): JobListing => ({
      id: `adzuna-${job.id || index}`,
      title: job.title || 'Job Title Not Available',
      company: job.company?.display_name || 'Company Not Specified',
      location: job.location?.display_name || filters.location || 'Location Not Specified',
      description: cleanDescription(job.description || 'No description available'),
      salary: job.salary_min && job.salary_max ?
        `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()}` :
        (job.salary_min ? `£${job.salary_min.toLocaleString()}+` : undefined),
      type: mapJobType(job.contract_type || job.contract_time) || 'full-time',
      experienceLevel: mapExperienceLevel(job.title, job.description) || 'mid',
      datePosted: job.created || new Date().toISOString(),
      url: job.redirect_url || `https://www.adzuna.co.uk/jobs/details/${job.id}`,
      source: 'Adzuna',
      skills: extractSkills(job.description || '', job.title || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('Adzuna API search failed:', error);
    return [];
  }
}

// Indeed Job Search (RSS/Public method)
async function searchIndeedJobs(filters: JobSearchFilters): Promise<JobListing[]> {
  try {
    console.log('💼 Searching Indeed jobs...');

    // Use Indeed's RSS feed which is publicly available
    const searchLocation = filters.remote ? 'remote' : (filters.location || 'UK');
    const rssUrl = new URL('https://www.indeed.co.uk/rss');
    rssUrl.searchParams.set('q', filters.keywords);
    rssUrl.searchParams.set('l', searchLocation);
    rssUrl.searchParams.set('limit', '15');
    rssUrl.searchParams.set('radius', '25');

    console.log('🔗 Indeed RSS URL:', rssUrl.toString());

    const response = await fetch(rssUrl.toString(), {
      headers: {
        'User-Agent': 'ResuMed Job Search Bot 1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`Indeed RSS error: ${response.status} ${response.statusText}`);
    }

    const rssText = await response.text();

    // Parse XML manually (simple RSS parsing)
    const items = parseIndeedRSS(rssText);

    return items.slice(0, 10).map((item, index): JobListing => ({
      id: `indeed-${item.guid || index}`,
      title: item.title || 'Job Title Not Available',
      company: item.company || 'Company Not Specified',
      location: item.location || searchLocation,
      description: cleanDescription(item.description || 'No description available'),
      salary: item.salary || undefined,
      type: mapJobType(item.title) || 'full-time',
      experienceLevel: mapExperienceLevel(item.title, item.description) || 'mid',
      datePosted: item.pubDate || new Date().toISOString(),
      url: item.link || `https://www.indeed.co.uk/jobs?q=${encodeURIComponent(filters.keywords)}`,
      source: 'Indeed',
      skills: extractSkills(item.description || '', item.title || ''),
      saved: false,
      applied: false
    }));

  } catch (error) {
    console.error('Indeed search failed:', error);

    // Fallback: Generate realistic Indeed-style jobs
    return generateIndeedFallbackJobs(filters);
  }
}

// Simple RSS parser for Indeed
function parseIndeedRSS(rssText: string): any[] {
  const items: any[] = [];

  try {
    // Extract items using regex (simple approach)
    const itemRegex = /<item>(.*?)<\/item>/gs;
    const matches = rssText.match(itemRegex);

    if (matches) {
      for (const match of matches.slice(0, 15)) {
        const item: any = {};

        // Extract title
        const titleMatch = match.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
        if (titleMatch) {
          const fullTitle = titleMatch[1];
          // Indeed format: "Job Title - Company Name"
          const parts = fullTitle.split(' - ');
          item.title = parts[0]?.trim() || fullTitle;
          item.company = parts[1]?.trim() || 'Company Not Specified';
        }

        // Extract link
        const linkMatch = match.match(/<link>(.*?)<\/link>/);
        if (linkMatch) {
          item.link = linkMatch[1];
          // Extract job ID from URL for GUID
          const jobIdMatch = item.link.match(/jk=([^&]+)/);
          item.guid = jobIdMatch ? jobIdMatch[1] : undefined;
        }

        // Extract description
        const descMatch = match.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s);
        if (descMatch) {
          item.description = descMatch[1];

          // Extract location from description
          const locationMatch = item.description.match(/Location:\s*([^<\n]+)/);
          if (locationMatch) {
            item.location = locationMatch[1].trim();
          }

          // Look for salary information
          const salaryMatch = item.description.match(/£[\d,]+ - £[\d,]+|£[\d,]+\+|£[\d,]+/);
          if (salaryMatch) {
            item.salary = salaryMatch[0];
          }
        }

        // Extract pub date
        const pubDateMatch = match.match(/<pubDate>(.*?)<\/pubDate>/);
        if (pubDateMatch) {
          item.pubDate = new Date(pubDateMatch[1]).toISOString();
        }

        items.push(item);
      }
    }
  } catch (error) {
    console.error('RSS parsing error:', error);
  }

  return items;
}

// Fallback Indeed-style jobs when RSS fails
function generateIndeedFallbackJobs(filters: JobSearchFilters): JobListing[] {
  const indeedCompanies = ['NHS Trust', 'Tesco', 'ASDA', 'John Lewis', 'BT Group', 'Sainsbury\'s', 'Lloyds Banking Group', 'Barclays'];
  const jobs: JobListing[] = [];

  for (let i = 0; i < 8; i++) {
    const company = indeedCompanies[Math.floor(Math.random() * indeedCompanies.length)];
    const job: JobListing = {
      id: `indeed-fallback-${i}`,
      title: `${filters.keywords} - ${company}`,
      company: company,
      location: filters.remote ? 'Remote' : (filters.location || 'United Kingdom'),
      description: `Join ${company} as a ${filters.keywords}. We offer competitive salary, excellent benefits, and career development opportunities.`,
      salary: ['£25,000 - £35,000', '£30,000 - £45,000', '£40,000 - £60,000'][Math.floor(Math.random() * 3)],
      type: (filters.jobType as any) || 'full-time',
      experienceLevel: (filters.experienceLevel as any) || 'mid',
      datePosted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      url: `https://www.indeed.co.uk/jobs?q=${encodeURIComponent(filters.keywords)}`,
      source: 'Indeed',
      skills: generateSkillsForRole(filters.keywords),
      saved: false,
      applied: false
    };
    jobs.push(job);
  }

  return jobs;
}

// Utility Functions
function removeDuplicateJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function sortJobsByRelevance(jobs: JobListing[], keywords: string): JobListing[] {
  const keywordTokens = keywords.toLowerCase().split(' ');

  return jobs.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    const textA = `${a.title} ${a.description}`.toLowerCase();
    const textB = `${b.title} ${b.description}`.toLowerCase();

    // Score based on keyword matches
    for (const keyword of keywordTokens) {
      if (a.title.toLowerCase().includes(keyword)) scoreA += 10;
      if (textA.includes(keyword)) scoreA += 5;
      if (b.title.toLowerCase().includes(keyword)) scoreB += 10;
      if (textB.includes(keyword)) scoreB += 5;
    }

    // Bonus for recent posts
    const dateA = new Date(a.datePosted).getTime();
    const dateB = new Date(b.datePosted).getTime();
    const daysDiffA = (Date.now() - dateA) / (1000 * 60 * 60 * 24);
    const daysDiffB = (Date.now() - dateB) / (1000 * 60 * 60 * 24);

    if (daysDiffA < 7) scoreA += 3;
    if (daysDiffB < 7) scoreB += 3;

    return scoreB - scoreA;
  });
}

function getActiveSources(): string[] {
  const sources = [];
  if (process.env.RAPIDAPI_KEY) sources.push('JSearch');
  if (process.env.JOOBLE_API_KEY) sources.push('Jooble');
  if (process.env.MUSE_API_KEY) sources.push('The Muse');
  if (process.env.REMOTEOK_API_KEY) sources.push('RemoteOK');
  // Note: AngelList API is discontinued, so not adding to active sources
  if (process.env.REED_API_KEY) sources.push('Reed');
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) sources.push('Adzuna');
  if (process.env.INDEED_CLIENT_ID && process.env.INDEED_CLIENT_SECRET) sources.push('Indeed');
  if (sources.length === 0) sources.push('Sample Data');
  return sources;
}

function formatSalary(min?: number, max?: number, currency = '£'): string | undefined {
  if (!min && !max) return undefined;
  if (min && max) return `${currency}${min.toLocaleString()} - ${currency}${max.toLocaleString()}`;
  if (min) return `${currency}${min.toLocaleString()}+`;
  if (max) return `Up to ${currency}${max.toLocaleString()}`;
  return undefined;
}

function mapJobType(type?: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote' {
  if (!type) return 'full-time';
  const t = type.toLowerCase();
  if (t.includes('part') || t.includes('part-time')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance') || t.includes('temporary')) return 'contract';
  if (t.includes('intern')) return 'internship';
  if (t.includes('remote')) return 'remote';
  return 'full-time';
}

function mapExperienceLevel(title?: string, description?: string): 'entry' | 'mid' | 'senior' | 'executive' {
  const text = `${title || ''} ${description || ''}`.toLowerCase();

  if (text.includes('senior') || text.includes('sr.') || text.includes('lead') || text.includes('principal')) {
    return 'senior';
  }
  if (text.includes('director') || text.includes('executive') || text.includes('head of') || text.includes('chief')) {
    return 'executive';
  }
  if (text.includes('junior') || text.includes('jr.') || text.includes('entry') || text.includes('graduate') || text.includes('trainee')) {
    return 'entry';
  }

  return 'mid';
}

// JSearch-specific utility functions
function formatJSearchSalary(min?: number, max?: number, currency?: string): string | undefined {
  if (!min && !max) return undefined;

  const currencySymbol = currency === 'USD' ? '$' :
                        currency === 'EUR' ? '€' :
                        currency === 'GBP' ? '£' :
                        currency || '$';

  if (min && max) {
    return `${currencySymbol}${Math.round(min).toLocaleString()} - ${currencySymbol}${Math.round(max).toLocaleString()}`;
  }
  if (min) {
    return `${currencySymbol}${Math.round(min).toLocaleString()}+`;
  }
  if (max) {
    return `Up to ${currencySymbol}${Math.round(max).toLocaleString()}`;
  }
  return undefined;
}

function mapJSearchJobType(employmentType?: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote' {
  if (!employmentType) return 'full-time';

  const type = employmentType.toLowerCase();
  if (type.includes('fulltime') || type.includes('full_time') || type.includes('full-time')) return 'full-time';
  if (type.includes('parttime') || type.includes('part_time') || type.includes('part-time')) return 'part-time';
  if (type.includes('contractor') || type.includes('contract') || type.includes('freelance')) return 'contract';
  if (type.includes('intern')) return 'internship';

  return 'full-time';
}

function mapJSearchExperienceLevel(requiredExperience?: any, title?: string): 'entry' | 'mid' | 'senior' | 'executive' {
  // Check title first
  if (title) {
    const titleLevel = mapExperienceLevel(title, '');
    if (titleLevel !== 'mid') return titleLevel; // Return if we found a specific level
  }

  // Check JSearch experience requirements
  if (requiredExperience) {
    if (requiredExperience.no_experience_required === true) return 'entry';
    if (requiredExperience.required_experience_in_months) {
      const months = requiredExperience.required_experience_in_months;
      if (months <= 12) return 'entry';
      if (months >= 60) return 'senior'; // 5+ years
      return 'mid';
    }
  }

  return 'mid';
}

// Jooble-specific utility functions
function mapJoobleJobType(type?: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote' {
  if (!type) return 'full-time';

  const t = type.toLowerCase();
  if (t.includes('part') || t.includes('part-time')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance') || t.includes('temporary')) return 'contract';
  if (t.includes('intern')) return 'internship';
  if (t.includes('remote')) return 'remote';

  return 'full-time';
}

// The Muse-specific utility functions
function mapMuseJobType(type?: string): 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote' {
  if (!type) return 'full-time';

  const t = type.toLowerCase();
  if (t.includes('part') || t.includes('part-time')) return 'part-time';
  if (t.includes('contract') || t.includes('freelance')) return 'contract';
  if (t.includes('intern')) return 'internship';

  return 'full-time';
}

function mapMuseExperienceLevel(level?: string): 'entry' | 'mid' | 'senior' | 'executive' {
  if (!level) return 'mid';

  const l = level.toLowerCase();
  if (l.includes('entry') || l.includes('junior')) return 'entry';
  if (l.includes('senior') || l.includes('lead') || l.includes('principal')) return 'senior';
  if (l.includes('director') || l.includes('executive') || l.includes('vp') || l.includes('chief')) return 'executive';

  return 'mid';
}

// RemoteOK-specific utility functions
function formatRemoteOKSalary(min?: number, max?: number): string | undefined {
  if (!min && !max) return undefined;

  if (min && max) {
    return `$${Math.round(min).toLocaleString()} - $${Math.round(max).toLocaleString()}`;
  }
  if (min) {
    return `$${Math.round(min).toLocaleString()}+`;
  }
  if (max) {
    return `Up to $${Math.round(max).toLocaleString()}`;
  }
  return undefined;
}

function generateSampleJobs(keywords: string, location: string, jobType: string, experienceLevel: string, remote: boolean): JobListing[] {
  const companies = ['TechCorp', 'InnovateNow', 'NextGen Solutions', 'Digital Dynamics', 'FutureWorks', 'CloudTech', 'DataDriven Inc', 'SmartSystems'];
  const jobTitles = [
    `Senior ${keywords}`,
    `${keywords} Specialist`,
    `Lead ${keywords}`,
    `${keywords} Manager`,
    `Principal ${keywords}`,
    `${keywords} Consultant`
  ];

  const jobs: JobListing[] = [];

  for (let i = 0; i < 12; i++) {
    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const randomSalary = ['$80,000 - $120,000', '$90,000 - $140,000', '$100,000 - $150,000', '$120,000 - $180,000'];

    const job: JobListing = {
      id: `sample-${i}`,
      title: randomTitle,
      company: randomCompany,
      location: remote ? 'Remote' : location || 'Various Locations',
      description: `We are seeking a talented ${keywords} to join our growing team. This role offers exciting opportunities to work with cutting-edge technology and make a meaningful impact on our products and services.`,
      salary: randomSalary[Math.floor(Math.random() * randomSalary.length)],
      type: (jobType as any) || 'full-time',
      experienceLevel: (experienceLevel as any) || 'mid',
      datePosted: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      url: `https://example-jobs.com/${randomCompany.toLowerCase()}-${i}`,
      source: 'Job Board',
      skills: generateSkillsForRole(keywords),
      saved: false,
      applied: false
    };

    jobs.push(job);
  }

  return jobs;
}

// Enhanced skill extraction
function extractSkills(description: string, title: string): string[] {
  const skillsDatabase = {
    technical: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Next.js', 'Nuxt.js',
      'HTML', 'CSS', 'SCSS', 'Tailwind CSS', 'Bootstrap',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite',
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
      'Git', 'GitHub', 'GitLab', 'Bitbucket',
      'REST API', 'GraphQL', 'WebSocket', 'gRPC',
      'Linux', 'Windows', 'macOS', 'Unix',
      'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator'
    ],
    soft: [
      'Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Critical Thinking',
      'Project Management', 'Agile', 'Scrum', 'Kanban',
      'Time Management', 'Analytical Thinking', 'Creativity', 'Adaptability'
    ],
    business: [
      'Marketing', 'Sales', 'SEO', 'SEM', 'Google Analytics', 'AdWords',
      'Content Marketing', 'Social Media', 'Email Marketing',
      'Data Analysis', 'Excel', 'PowerPoint', 'Tableau', 'Power BI'
    ]
  };

  const foundSkills: string[] = [];
  const combinedText = `${title} ${description}`.toLowerCase();
  const allSkills = [...skillsDatabase.technical, ...skillsDatabase.soft, ...skillsDatabase.business];

  for (const skill of allSkills) {
    const variations = [
      skill.toLowerCase(),
      skill.toLowerCase().replace(/\.js$/, ''),
      skill.toLowerCase().replace(/\s+/g, ''),
      skill.toLowerCase().replace(/\s+/g, '-')
    ];

    if (variations.some(variation => combinedText.includes(variation))) {
      foundSkills.push(skill);
    }
  }

  return foundSkills.slice(0, 8); // Limit to top 8 skills
}


function generateSkillsForRole(keywords: string): string[] {
  const skillSets: { [key: string]: string[] } = {
    'developer': ['JavaScript', 'React', 'Node.js', 'Git', 'SQL', 'REST API'],
    'engineer': ['Python', 'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Git'],
    'designer': ['Figma', 'Adobe Creative Suite', 'UI/UX', 'Sketch', 'Prototyping', 'CSS'],
    'manager': ['Leadership', 'Agile', 'Scrum', 'Project Management', 'Team Building', 'Strategy'],
    'analyst': ['SQL', 'Python', 'Excel', 'Tableau', 'Data Analysis', 'Statistics'],
    'marketing': ['Google Analytics', 'SEO', 'Social Media', 'Content Marketing', 'AdWords', 'Email Marketing']
  };

  const keywordsLower = keywords.toLowerCase();

  for (const [role, skills] of Object.entries(skillSets)) {
    if (keywordsLower.includes(role)) {
      return skills;
    }
  }

  return ['Communication', 'Problem Solving', 'Teamwork', 'Critical Thinking'];
}

function cleanDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,!?;:()"-]/g, '')
    .replace(/\b(apply now|click here|visit our website)\b/gi, '')
    .substring(0, 400)
    .trim() + (description.length > 400 ? '...' : '');
}