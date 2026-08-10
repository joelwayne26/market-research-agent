-- ============================================
-- Market Research Agent Database Schema
-- PostgreSQL with pgvector extension
-- ============================================

-- Enable pgvector for AI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLE: research_projects
-- Main project tracking
-- ============================================
CREATE TABLE IF NOT EXISTS research_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Research configuration
    target_market VARCHAR(255),
    competitors TEXT[],           -- Array of competitor names/URLs
    keywords TEXT[],
    research_type VARCHAR(50) DEFAULT 'comprehensive' CHECK (research_type IN (
        'competitive_analysis',
        'market_trends',
        'customer_sentiment',
        'pricing_analysis',
        'comprehensive'
    )),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'running',
        'completed',
        'failed',
        'archived'
    )),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Results summary
    total_sources_analyzed INTEGER DEFAULT 0,
    key_findings JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_by VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_research_projects_status ON research_projects(status);
CREATE INDEX idx_research_projects_type ON research_projects(research_type);
CREATE INDEX idx_research_projects_created ON research_projects(created_at DESC);

-- ============================================
-- TABLE: data_sources
-- Websites, APIs, and data feeds being scraped
-- ============================================
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN (
        'website',
        'api',
        'social_media',
        'news_feed',
        'ecommerce',
        'forum',
        'document'
    )),
    
    url VARCHAR(500),
    name VARCHAR(255),
    description TEXT,
    
    -- Scraping configuration
    scrape_config JSONB DEFAULT '{}'::jsonb,
    frequency VARCHAR(50) DEFAULT 'once',  -- once, daily, weekly
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'scraping',
        'success',
        'failed',
        'skipped'
    )),
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Statistics
    pages_scraped INTEGER DEFAULT 0,
    data_points_collected INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_data_sources_project ON data_sources(project_id);
CREATE INDEX idx_data_sources_status ON data_sources(status);
CREATE INDEX idx_data_sources_type ON data_sources(source_type);

-- ============================================
-- TABLE: raw_data
-- Collected raw data from scraping
-- ============================================
CREATE TABLE IF NOT EXISTS raw_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text' CHECK (content_type IN (
        'text',
        'html',
        'json',
        'csv',
        'pdf_text'
    )),
    
    -- Source information
    source_url VARCHAR(500),
    title VARCHAR(500),
    author VARCHAR(255),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    hash VARCHAR(64),  -- For deduplication
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_raw_data_project ON raw_data(project_id);
CREATE INDEX idx_raw_data_source ON raw_data(source_id);
CREATE INDEX idx_raw_data_hash ON raw_data(hash);
CREATE INDEX idx_raw_data_created ON raw_data(created_at DESC);

-- ============================================
-- TABLE: analyzed_data
-- AI-processed and analyzed data
-- ============================================
CREATE TABLE IF NOT EXISTS analyzed_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    raw_data_id UUID REFERENCES raw_data(id) ON DELETE SET NULL,
    
    -- Analysis results
    analysis_type VARCHAR(50) NOT NULL CHECK (analysis_type IN (
        'sentiment',
        'entity_extraction',
        'topic_modeling',
        'trend_detection',
        'competitor_comparison',
        'pricing_extraction',
        'summary'
    )),
    
    result JSONB NOT NULL,           -- Structured analysis output
    confidence_score FLOAT,          -- AI confidence 0-1
    insights TEXT[],                 -- Key insights extracted
    
    -- Vector embedding for similarity search
    embedding vector(1536),
    
    -- Categorization
    category VARCHAR(100),
    tags TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analyzed_data_project ON analyzed_data(project_id);
CREATE INDEX idx_analyzed_data_type ON analyzed_data(analysis_type);
CREATE INDEX idx_analyzed_data_category ON analyzed_data(category);

-- Vector index for semantic search
CREATE INDEX idx_analyzed_data_embedding ON analyzed_data 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- ============================================
-- TABLE: market_intelligence
-- Aggregated market insights and trends
-- ============================================
CREATE TABLE IF NOT EXISTS market_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    
    insight_type VARCHAR(50) NOT NULL CHECK (insight_type IN (
        'trend',
        'opportunity',
        'threat',
        'competitive_move',
        'customer_need',
        'price_change',
        'market_shift'
    )),
    
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Quantitative data
    metrics JSONB DEFAULT '{}'::jsonb,
    impact_score FLOAT CHECK (impact_score >= 0 AND impact_score <= 10),
    confidence_level FLOAT CHECK (confidence_level >= 0 AND confidence_level <= 1),
    
    -- Time relevance
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Relationships
    related_to UUID[] DEFAULT '{}',  -- IDs of related intelligence entries
    source_evidence JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN (
        'new',
        'verified',
        'acted_upon',
        'dismissed',
        'expired'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_market_intelligence_project ON market_intelligence(project_id);
CREATE INDEX idx_market_intelligence_type ON market_intelligence(insight_type);
CREATE INDEX idx_market_intelligence_impact ON market_intelligence(impact_score DESC);
CREATE INDEX idx_market_intelligence_status ON market_intelligence(status);

-- ============================================
-- TABLE: competitor_profiles
-- Detailed competitor information
-- ============================================
CREATE TABLE IF NOT EXISTS competitor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    description TEXT,
    
    -- Company info
    founded_year INTEGER,
    employee_count_estimate VARCHAR(100),
    funding_info TEXT,
    revenue_estimate VARCHAR(100),
    
    -- Digital presence
    alexa_rank INTEGER,
    monthly_visits_estimate BIGINT,
    social_followers JSONB DEFAULT '{}'::jsonb,
    
    -- Analysis
    strengths TEXT[],
    weaknesses TEXT[],
    market_positioning TEXT,
    unique_value_proposition TEXT,
    
    -- Pricing data collected
    pricing_data JSONB DEFAULT '[]'::jsonb,
    pricing_last_updated TIMESTAMP WITH TIME ZONE,
    
    -- Vector embedding for comparison
    profile_embedding vector(1536),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitor_profiles_project ON competitor_profiles(project_id);
CREATE INDEX idx_competitor_profiles_name ON competitor_profiles(name);

-- ============================================
-- TABLE: research_reports
-- Generated reports and exports
-- ============================================
CREATE TABLE IF NOT EXISTS research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES research_projects(id) ON DELETE CASCADE,
    
    title VARCHAR(500) NOT NULL,
    report_type VARCHAR(50) DEFAULT 'full' CHECK (report_type IN (
        'executive_summary',
        'full_report',
        'competitive_analysis',
        'trend_report',
        'custom'
    )),
    
    -- Report content
    content TEXT,
    content_json JSONB,
    
    -- Export formats available
    export_formats TEXT[] DEFAULT ARRAY['pdf', 'html'],
    
    -- Generation metadata
    generated_by VARCHAR(50) DEFAULT 'ai',  -- ai, manual, template
    template_used VARCHAR(100),
    
    -- File storage
    file_path VARCHAR(500),
    file_size_bytes BIGINT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'generating' CHECK (status IN (
        'generating',
        'ready',
        'failed',
        'archived'
    )),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_project ON research_reports(project_id);
CREATE INDEX idx_reports_type ON research_reports(report_type);
CREATE INDEX idx_reports_status ON research_reports(status);

-- ============================================
-- TABLE: audit_log
-- Complete action trail
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES research_projects(id),
    
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),  -- project, source, data, report
    entity_id UUID,
    
    actor_type VARCHAR(50) DEFAULT 'system' CHECK (actor_type IN (
        'system',
        'user',
        'ai_agent',
        'scheduler'
    )),
    actor_id VARCHAR(255),
    
    details JSONB,
    previous_state JSONB,
    new_state JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_project ON audit_log(project_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at columns
CREATE TRIGGER update_research_projects_updated_at BEFORE UPDATE ON research_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_market_intelligence_updated_at BEFORE UPDATE ON market_intelligence
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competitor_profiles_updated_at BEFORE UPDATE ON competitor_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON research_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log state changes
CREATE OR REPLACE FUNCTION log_research_state_changes()
RETURNS TRIGGER AS $$
DECLARE
    action_text TEXT;
BEGIN
    IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        action_text := 'status_change_' || NEW.status;
        INSERT INTO audit_log (project_id, action, entity_type, entity_id, details, previous_state, new_state)
        VALUES (NEW.id, action_text, TG_TABLE_NAME, NEW.id,
                jsonb_build_object('table', TG_TABLE_NAME, 'old_status', OLD.status, 'new_status', NEW.status),
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER log_project_state_changes AFTER UPDATE ON research_projects
    FOR EACH ROW EXECUTE FUNCTION log_research_state_changes();

-- ============================================
-- VIEWS FOR ANALYTICS
-- ============================================

-- Project dashboard view
CREATE OR REPLACE VIEW v_project_dashboard AS
SELECT 
    p.*,
    COUNT(DISTINCT ds.id) as total_sources,
    COUNT(DISTINCT CASE WHEN ds.status = 'success' THEN ds.id END) as successful_sources,
    COUNT(DISTINCT rd.id) as total_data_points,
    COUNT(DISTINCT ad.id) as total_analyses,
    COUNT(DISTINCT mi.id) as total_insights,
    COUNT(DISTINCT cp.id) as competitors_tracked
FROM research_projects p
LEFT JOIN data_sources ds ON p.id = ds.project_id
LEFT JOIN raw_data rd ON p.id = rd.project_id
LEFT JOIN analyzed_data ad ON p.id = ad.project_id
LEFT JOIN market_intelligence mi ON p.id = mi.project_id
LEFT JOIN competitor_profiles cp ON p.id = cp.project_id
GROUP BY p.id;

-- Active projects view
CREATE OR REPLACE VIEW v_active_projects AS
SELECT * FROM research_projects 
WHERE status IN ('draft', 'running')
ORDER BY updated_at DESC;

-- Recent insights view
CREATE OR REPLACE VIEW v_recent_insights AS
SELECT 
    mi.*,
    p.name as project_name,
    p.target_market
FROM market_intelligence mi
JOIN research_projects p ON mi.project_id = p.id
WHERE mi.status IN ('new', 'verified')
ORDER BY mi.detected_at DESC
LIMIT 100;

-- Competitor comparison view
CREATE OR REPLACE VIEW v_competitor_comparison AS
SELECT 
    cp1.name as competitor_1,
    cp2.name as competitor_2,
    1 - (cp1.profile_embedding <=> cp2.profile_embedding) as similarity_score
FROM competitor_profiles cp1
CROSS JOIN competitor_profiles cp2
WHERE cp1.id < cp2.id
  AND cp1.profile_embedding IS NOT NULL
  AND cp2.profile_embedding IS NOT NULL
ORDER BY similarity_score DESC;

-- ============================================
-- SEED DATA (Sample)
-- ============================================

INSERT INTO research_projects (name, description, target_market, research_type, status) VALUES
('E-commerce SaaS Competitive Analysis', 
 'Analyze top 10 e-commerce SaaS platforms for feature comparison and market positioning',
 'E-commerce Software',
 'competitive_analysis',
 'draft'),
('AI Tools Market Trends 2024',
 'Track emerging trends in the AI tools market including pricing, features, and adoption',
 'Artificial Intelligence Software',
 'market_trends',
 'draft');

SELECT 'Market Research Agent database initialized successfully!' as status;
