# DataOps JIRA Agent - Product Design Document

## **1. Introduction**

### **1.1 Executive Summary**

The DataOps JIRA Agent is an intelligent automation platform designed to transform how DataOps and MLOps teams manage their work intake and ticket creation processes. By leveraging local AI processing and intelligent pattern recognition, the system reduces ticket creation time from 10+ minutes to under 60 seconds while maintaining complete data privacy and compliance.

### **1.2 Problem Statement**

DataOps and MLOps teams face unique operational challenges:
- **High volume of unplanned work**: Unlike product teams, ops teams handle constant ad-hoc requests through multiple channels (email, Slack, meetings)
- **Manual ticket creation burden**: Project Managers spend 2-3 hours daily writing and maintaining JIRA tickets
- **Scattered request sources**: Work intake through emails, chats, calls, and meetings with no centralized processing
- **Data sensitivity concerns**: Healthcare, financial, and enterprise data contains PII/PHI that cannot be sent to external APIs
- **Context loss**: Requests lack historical context, leading to repeated clarifications and delays
- **Pattern blindness**: Similar requests are processed manually each time without learning from repetition

### **1.3 Solution Overview**

The JIRA Agent provides an end-to-end solution through:
- **Unified intake processing**: Monitors all communication channels and automatically extracts request information
- **Local AI processing**: Uses on-premise LLMs to ensure sensitive data never leaves the organization
- **Intelligent field mapping**: Automatically populates JIRA fields based on request content and historical patterns
- **Knowledge accumulation**: Builds a searchable knowledge base from past tickets, documentation, and resolutions
- **Human-in-the-loop validation**: PMs review and can edit all fields before ticket creation
- **Continuous learning**: Improves accuracy by learning from corrections and identifying patterns

### **1.4 Key Stakeholders**

**Primary Users**:
- **DataOps/MLOps Project Managers**: Review and approve tickets, manage workflows
- **Team Leads**: Configure patterns, set automation rules
- **System Administrators**: Manage connections, monitor system health

**Secondary Users**:
- **Data Engineers**: Submit requests, track ticket status
- **Product Managers**: Request data pulls, monitor progress
- **Business Analysts**: Access reporting and analytics

### **1.5 Success Metrics**

- **Efficiency**: 90% reduction in ticket creation time
- **Accuracy**: 85%+ first-pass approval rate without edits
- **Coverage**: 95% of requests captured automatically
- **Compliance**: 100% PII/PHI detection and masking
- **Adoption**: 80%+ daily active usage by PMs
- **Learning**: 2-3 new patterns identified weekly

## **2. User Journeys**

### **2.1 Journey: First-Time Setup and Onboarding**

**User**: System Administrator / Lead PM
**Goal**: Configure the agent for the team's specific needs
**Context**: New installation, team has been managing tickets manually

**Journey Steps**:

1. **Initial Access**
   - Admin receives setup credentials
   - Logs into fresh installation
   - Sees welcome wizard with setup checklist

2. **JIRA Connection Configuration**
   - Enters JIRA instance URL (company.atlassian.net)
   - Provides API token for authentication
   - System tests connection and confirms success
   - Fetches available projects automatically

3. **Project Mapping**
   - Selects relevant JIRA projects (DataOps, MLOps)
   - System discovers issue types, fields, workflows
   - Maps custom fields to agent categories:
     - "Request Type" → JIRA "Category" field
     - "Data Sources" → JIRA "Tables" field
     - "Compliance" → JIRA "Data Classification" field
   - Sets default values for common fields

4. **Data Source Integration**
   - **Email Setup**:
     - Configures IMAP for dataops-requests@company.com
     - Sets sync frequency (every 5 minutes)
     - Tests by sending sample email

   - **Slack Integration**:
     - OAuth authentication with workspace
     - Selects channels (#data-requests, #data-support)
     - Configures real-time webhook

   - **File System**:
     - Points to shared drive /shared/requests
     - Sets file type filters (.txt, .eml, .pdf)
     - Configures watch frequency

5. **Knowledge Base Initialization**
   - Connects to Confluence spaces
   - Uploads existing documentation (PDFs, templates)
   - Imports last 30 days of JIRA tickets
   - System begins pattern extraction

6. **Processing Rules Configuration**
   - Sets auto-approval threshold (90% confidence)
   - Configures PII handling (mask and store)
   - Defines priority keywords ("urgent", "board meeting")
   - Sets up team member assignments

7. **Validation and Testing**
   - Processes sample requests
   - Admin reviews extraction accuracy
   - Adjusts field mappings if needed
   - Approves first auto-generated ticket

**Outcome**: Fully configured system ready for production use
**Time Required**: 30-45 minutes
**Success Indicators**: All connections green, first ticket created successfully

### **2.2 Journey: Daily Morning Queue Review**

**User**: DataOps Project Manager
**Goal**: Process overnight requests efficiently
**Context**: Typically 20-30 requests accumulate overnight

**Journey Steps**:

1. **Morning Login**
   - Opens dashboard at 9 AM
   - Sees summary: "23 new requests overnight"
   - AI assistant greets: "Good morning Sarah, 8 requests are high-confidence and ready for quick approval"

2. **Quick Triage from Dashboard**
   - Views analytics showing request breakdown
   - Notices 3 marked as high priority
   - Sees confidence distribution: 8 >90%, 12 70-90%, 3 <70%

3. **Bulk Processing High-Confidence Requests**
   - Clicks "23 pending" to enter request queue
   - Filters to show high-confidence only
   - Reviews titles and extracted fields quickly
   - Selects all 8 high-confidence requests
   - Clicks "Bulk Approve"
   - System creates JIRA tickets automatically

4. **Individual Review of Medium-Confidence Requests**
   - Switches to medium-confidence filter
   - Opens first request for review
   - Sees original email alongside extracted fields
   - Notices table name extracted incorrectly
   - Edits field: changes "sales_temp" to "sales_transactions"
   - Approves with correction
   - System learns from this correction

5. **Detailed Review of Complex Requests**
   - Opens low-confidence request
   - Reads full original content
   - Request is ambiguous about requirements
   - Adds comment: "Need clarification on date range"
   - Assigns to self for follow-up
   - Moves to "Pending Information" status

6. **Pattern Recognition**
   - Notices 5 similar requests about Q4 reporting
   - AI suggests: "Create pattern for quarterly reports?"
   - Reviews pattern definition
   - Approves pattern creation
   - Future similar requests will auto-populate

**Outcome**: 23 requests processed in 15 minutes
**Previous Method**: 2-3 hours of manual work
**Success Indicators**: 20 tickets created, 3 pending clarification, 1 new pattern learned

### **2.3 Journey: Handling Sensitive Data Request**

**User**: Healthcare DataOps PM
**Goal**: Process request containing PHI safely and compliantly
**Context**: Request contains patient information that must be protected

**Journey Steps**:

1. **Request Arrival**
   - Email arrives with patient data request
   - System immediately detects PHI presence
   - Creates sanitized version for processing

2. **PII/PHI Detection Alert**
   - PM sees request marked with red "PHI Detected" badge
   - Original shows: "Patient John Smith, DOB 01/15/1980, MRN 456789"
   - Sanitized shows: "Patient [PATIENT_001], DOB [DOB_001], MRN [MRN_001]"

3. **Secure Review Process**
   - Opens request in secure review mode
   - Sees split screen: masked version and extraction
   - Verifies request intent preserved despite masking
   - Confirms all PHI properly identified

4. **JIRA Field Configuration**
   - Adds compliance tag: "PHI-Protected"
   - Sets restricted access in JIRA
   - Adds handling note: "Contains PHI - follow protocol 4.2"
   - Links to data handling procedure

5. **Approval with Restrictions**
   - Approves ticket creation
   - System creates JIRA ticket with masked data only
   - Original PHI stored in encrypted local vault
   - Audit log entry created with access record

6. **Secure Reference Storage**
   - Mapping between masked and real data stored securely
   - Only authorized users can access mapping
   - Automatic audit trail for any access
   - 30-day retention then secure deletion

**Outcome**: PHI request processed compliantly
**Compliance**: Full HIPAA compliance maintained
**Success Indicators**: Zero PHI exposed, complete audit trail, ticket created

### **2.4 Journey: Learning from Corrections**

**User**: Team Lead PM
**Goal**: Improve system accuracy by teaching new patterns
**Context**: Notice recurring correction pattern, want to automate

**Journey Steps**:

1. **Pattern Recognition**
   - Reviews weekly analytics
   - Notices same field corrected 8 times
   - All from Finance team about monthly reports

2. **Pattern Investigation**
   - Clicks "View Corrections" in analytics
   - Sees all 8 instances had:
     - Priority changed from Medium to High
     - Added label "monthly-finance-report"
     - Assigned to same team member

3. **Pattern Creation**
   - AI suggests: "Create pattern for Finance monthly reports?"
   - Opens pattern builder
   - Reviews auto-generated pattern rules:
     - IF from: finance-team@company.com
     - AND contains: "monthly report"
     - THEN: Priority = High, Label = monthly-finance-report

4. **Pattern Testing**
   - Tests against historical requests
   - Shows 15 matches in past data
   - 14 would be correct, 1 false positive
   - Refines pattern to exclude the outlier

5. **Pattern Activation**
   - Names pattern: "Finance Monthly Reports"
   - Sets confidence level: 95%
   - Enables auto-approval for this pattern
   - Saves and activates

6. **Immediate Impact**
   - Next finance request arrives
   - Pattern automatically applied
   - All fields correctly populated
   - Auto-approved without PM intervention

**Outcome**: Future finance requests fully automated
**Time Saved**: 5 minutes per request going forward
**Success Indicators**: Pattern accuracy 95%+, auto-approval enabled

### **2.5 Journey: Building Knowledge Context**

**User**: System Administrator
**Goal**: Enrich system knowledge for better request processing
**Context**: Team has lots of documentation that could help with context

**Journey Steps**:

1. **Knowledge Audit**
   - Reviews current extraction accuracy: 72%
   - Identifies gaps in system knowledge
   - Missing: technical specifications, data dictionary

2. **Confluence Integration**
   - Navigates to Connections section
   - Adds Confluence connection
   - Selects DataOps documentation space
   - Chooses specific pages to index:
     - Data Request Templates
     - Table Definitions
     - Standard Operating Procedures

3. **Document Upload**
   - Uploads team's Data Dictionary (PDF, 150 pages)
   - System extracts table definitions, relationships
   - Uploads PowerPoint from planning meeting
   - Extracts upcoming project requirements

4. **Custom Template Creation**
   - Creates request template for common scenarios
   - Defines field mappings for each template
   - Sets trigger conditions for template use

5. **Knowledge Testing**
   - Submits test request mentioning specific table
   - System now recognizes table from dictionary
   - Auto-populates related fields
   - Links to relevant Confluence page

6. **Monitoring Impact**
   - Watches accuracy over next week
   - Sees improvement from 72% to 86%
   - Fewer clarification requests needed
   - PMs report better field population

**Outcome**: Significantly improved extraction accuracy
**Accuracy Improvement**: 72% → 86%
**Success Indicators**: Reduced clarification requests, better field population

## **3. Features & Use Cases**

### **3.1 Intelligent Request Processing**

#### **3.1.1 Multi-Channel Monitoring**

**Feature Description**:
The system continuously monitors multiple communication channels simultaneously, providing a unified intake point for all data requests regardless of origin.

**Components**:
- Email inbox monitoring with IMAP/Exchange integration
- Slack/Teams real-time webhook listeners
- File system watchers for shared drives
- Meeting transcript processors
- API endpoints for direct submissions

**Use Cases**:

**Use Case 1: Email Request Processing**
*Scenario*: Business analyst sends email requesting customer data
*Process*:
- System polls email every 5 minutes
- Detects new message in monitored inbox
- Extracts sender, subject, body, attachments
- Parses content for request indicators
- Creates request record with metadata
- Triggers processing pipeline

**Use Case 2: Slack Emergency Request**
*Scenario*: Engineer posts in #data-support about pipeline failure
*Process*:
- Webhook receives message in real-time
- Detects keywords "pipeline failed", "urgent"
- Elevates priority automatically
- Extracts error details and affected systems
- Creates high-priority maintenance ticket
- Notifies on-call PM immediately

**Use Case 3: Batch File Processing**
*Scenario*: Weekly batch of request forms dropped in shared folder
*Process*:
- File watcher detects new CSV file
- Parses structured request format
- Processes each row as separate request
- Groups related requests together
- Creates bulk tickets with relationships
- Generates processing report

#### **3.1.2 Natural Language Processing**

**Feature Description**:
Local LLM processes unstructured text to extract structured ticket information without sending data to external services.

**Components**:
- Named entity recognition for technical terms
- Intent classification for request types
- Temporal extraction for deadlines
- Priority inference from context
- Table/field identification

**Use Cases**:

**Use Case 1: Ambiguous Request Interpretation**
*Scenario*: "Need the usual monthly sales stuff for the board"
*Process*:
- Searches historical requests from same sender
- Finds pattern of monthly board reports
- Retrieves previous ticket details
- Pre-fills based on historical pattern
- Marks for review with context note

**Use Case 2: Technical Specification Extraction**
*Scenario*: Long email with requirements buried in paragraphs
*Process*:
- Identifies technical indicators (table names, dates)
- Extracts SQL snippets or query logic
- Recognizes data volume indicators
- Pulls out business justification
- Structures into JIRA description format

### **3.2 Privacy & Compliance Management**

#### **3.2.1 PII/PHI Detection and Masking**

**Feature Description**:
Automated detection and masking of sensitive information ensures compliance while maintaining request context.

**Components**:
- Pattern-based detection (SSN, credit cards, medical records)
- Context-aware entity recognition
- Reversible masking with secure vault
- Audit trail generation
- Compliance reporting

**Use Cases**:

**Use Case 1: Healthcare Data Request**
*Scenario*: Request contains patient names and medical record numbers
*Process*:
- Scans content with medical NLP models
- Identifies patient identifiers
- Generates unique masked tokens
- Stores mapping in encrypted vault
- Processes request with masked version
- Maintains referential integrity

**Use Case 2: Financial Data Protection**
*Scenario*: Request includes customer SSNs and account numbers
*Process*:
- Detects financial patterns
- Masks with format-preserving encryption
- Maintains data type for validation
- Creates compliance attestation
- Flags for restricted access

#### **3.2.2 Local Processing Architecture**

**Feature Description**:
All processing happens within organizational boundaries using local resources.

**Components**:
- On-premise LLM deployment (Llama/Mistral)
- Local vector database for embeddings
- Encrypted storage for sensitive data
- Internal API endpoints only
- Air-gapped operation capability

**Use Cases**:

**Use Case 1: Air-Gapped Environment**
*Scenario*: Government agency with no external connectivity
*Process*:
- Runs entirely on local infrastructure
- Uses pre-trained models without updates
- Processes requests without external calls
- Maintains full functionality offline
- Syncs when connection available

### **3.3 JIRA Integration & Field Management**

#### **3.3.1 Dynamic Field Mapping**

**Feature Description**:
Automatically discovers and maps JIRA fields to extracted information with user-configurable rules.

**Components**:
- JIRA schema discovery
- Field type detection
- Custom field handlers
- Validation rule import
- Default value configuration

**Use Cases**:

**Use Case 1: Custom Field Population**
*Scenario*: Organization uses custom "Data Classification" field
*Process*:
- Discovers field during setup
- Identifies as single-select type
- Maps to extracted compliance tags
- Validates against allowed values
- Suggests appropriate value

**Use Case 2: Complex Workflow Fields**
*Scenario*: Different fields required for different issue types
*Process*:
- Learns field requirements per type
- Shows/hides fields based on selection
- Validates required field completion
- Prevents submission errors
- Suggests fields based on content

#### **3.3.2 Ticket Preview and Editing**

**Feature Description**:
Full JIRA ticket preview with inline editing capabilities before creation.

**Components**:
- WYSIWYG preview renderer
- Real-time validation
- Field autocomplete
- Rich text editor
- Attachment handling

**Use Cases**:

**Use Case 1: Field Correction**
*Scenario*: PM needs to adjust extracted priority
*Process*:
- Shows current field values
- Allows inline editing
- Validates against JIRA rules
- Shows impact of changes
- Saves corrections for learning

**Use Case 2: Enrichment with Context**
*Scenario*: PM adds additional context to ticket
*Process*:
- Expands description field
- Adds clarifying information
- Links related tickets
- Attaches documentation
- Tags relevant team members

### **3.4 Knowledge Management System**

#### **3.4.1 Documentation Integration**

**Feature Description**:
Connects to and indexes organizational documentation for context enrichment.

**Components**:
- Confluence space crawler
- PDF text extraction
- SharePoint connector
- Wiki page indexer
- Version tracking

**Use Cases**:

**Use Case 1: Automatic Documentation Linking**
*Scenario*: Request mentions specific data pipeline
*Process*:
- Searches indexed documentation
- Finds pipeline specification page
- Links to relevant section
- Extracts key requirements
- Adds as ticket context

**Use Case 2: Template Suggestion**
*Scenario*: Request matches documented procedure
*Process*:
- Identifies procedure match
- Suggests template from docs
- Pre-fills standard fields
- Links to full procedure
- Tracks template usage

#### **3.4.2 Pattern Learning Engine**

**Feature Description**:
Continuously learns from corrections and repetitions to improve accuracy.

**Components**:
- Correction tracker
- Pattern identifier
- Confidence calculator
- Rule generator
- Performance monitor

**Use Cases**:

**Use Case 1: Recurring Request Pattern**
*Scenario*: Weekly reports always need same configuration
*Process*:
- Detects weekly recurrence
- Identifies common fields
- Creates pattern rule
- Tests against history
- Activates when confident

**Use Case 2: Team-Specific Patterns**
*Scenario*: Finance team has unique request format
*Process*:
- Groups requests by sender domain
- Finds team-specific patterns
- Creates team rules
- Applies automatically
- Adjusts based on feedback

### **3.5 Analytics and Insights**

#### **3.5.1 Operational Metrics**

**Feature Description**:
Real-time dashboards showing system performance and team efficiency.

**Components**:
- Processing statistics
- Accuracy tracking
- Time savings calculator
- Trend analysis
- Comparative metrics

**Use Cases**:

**Use Case 1: ROI Demonstration**
*Scenario*: Manager needs to justify system value
*Process*:
- Calculates time saved daily
- Converts to monetary value
- Shows accuracy improvements
- Demonstrates volume handled
- Exports executive report

**Use Case 2: Bottleneck Identification**
*Scenario*: Certain requests taking longer to process
*Process*:
- Analyzes processing times
- Identifies slow patterns
- Shows correlation factors
- Suggests optimizations
- Tracks improvement

#### **3.5.2 Predictive Analytics**

**Feature Description**:
Forecasts request volumes and identifies trends for better resource planning.

**Components**:
- Volume forecasting
- Seasonal pattern detection
- Capacity planning
- Workload distribution
- Anomaly detection

**Use Cases**:

**Use Case 1: Capacity Planning**
*Scenario*: Predicting next month's request volume
*Process*:
- Analyzes historical patterns
- Identifies seasonal trends
- Accounts for business events
- Forecasts daily volumes
- Suggests staffing levels

**Use Case 2: Anomaly Detection**
*Scenario*: Unusual spike in specific request type
*Process*:
- Detects deviation from normal
- Alerts PM to anomaly
- Investigates root cause
- Suggests response action
- Updates patterns

### **3.6 AI Assistant Capabilities**

#### **3.6.1 Conversational Interface**

**Feature Description**:
Natural language chat interface for controlling system and getting insights.

**Components**:
- Context-aware responses
- Action execution
- Query answering
- Suggestion engine
- Voice input support

**Use Cases**:

**Use Case 1: Bulk Operations via Chat**
*Scenario*: PM wants to approve all high-confidence tickets
*Process*:
- Types: "approve all above 90%"
- Assistant confirms count
- Executes bulk approval
- Reports completion
- Shows next actions

**Use Case 2: Quick Status Check**
*Scenario*: Need to know current queue status
*Process*:
- Asks: "what's pending?"
- Assistant summarizes queue
- Highlights urgent items
- Suggests actions
- Offers drill-down options

#### **3.6.2 Proactive Assistance**

**Feature Description**:
AI provides contextual suggestions and alerts without being asked.

**Components**:
- Situation awareness
- Proactive alerts
- Suggestion timing
- Context relevance
- Learning from dismissals

**Use Cases**:

**Use Case 1: Pattern Recognition Alert**
*Scenario*: Multiple similar requests detected
*Process*:
- Notices pattern forming
- Alerts PM proactively
- Suggests pattern creation
- Shows potential impact
- Facilitates quick setup

**Use Case 2: Workload Warning**
*Scenario*: Queue building up unusually
*Process*:
- Detects queue growth
- Alerts before problem
- Suggests bulk actions
- Offers to adjust rules
- Prevents backlog

## **4. Layout Design Specifications**

### **4.1 Application Structure**

#### **4.1.1 Three-Panel Layout**

**Overall Structure**:
The application uses a consistent three-panel layout across all pages:

**Left Navigation Panel** (250px fixed width):
- Remains visible on all screens
- Contains primary navigation menu
- Shows system health indicators
- Displays quick statistics
- Houses user profile section at bottom

**Center Content Area** (Flexible width):
- Main interaction space
- Adjusts to screen size
- Minimum width: 600px
- Maximum width: 1400px
- Contains page-specific content

**Right Assistant Panel** (320px when open):
- Collapsible to save space
- Opens/closes with animation
- Persistent across navigation
- Contains chat interface
- Shows contextual help

#### **4.1.2 Responsive Behavior**

**Desktop (>1440px)**:
- All three panels visible
- Optimal spacing and padding
- Full feature set available
- Multi-column layouts in content area

**Tablet (768px - 1439px)**:
- Navigation collapses to icons
- Assistant panel overlays when open
- Content area takes full width
- Touch-optimized controls

**Mobile (320px - 767px)**:
- Navigation becomes hamburger menu
- Assistant accessible via floating button
- Content stacks vertically
- Simplified interactions

### **4.2 Page-Specific Layouts**

#### **4.2.1 Analytics Dashboard Layout**

**Grid Structure**:
- 12-column grid system
- 16px gutters between columns
- 24px padding around edges

**Component Arrangement**:

**Metrics Cards Row** (Full width):
- 4 equal cards in a row
- Each card 3 columns wide
- Height: 120px
- Contains: Large number, label, trend, sparkline

**Activity and Charts Row** (Full width):
- Activity feed: 8 columns, left side
- Request volume chart: 4 columns, right side
- Height: 400px
- Real-time updates

**Bottom Analytics Row** (Full width):
- Request types pie chart: 4 columns
- Top requesters table: 4 columns
- Pattern performance: 4 columns
- Height: 300px

#### **4.2.2 Requests Queue Layout**

**Header Section** (Fixed position):
- Filter bar with dropdowns
- Search box
- Bulk action buttons
- View toggle (card/table)
- Height: 80px

**Queue Display Area** (Scrollable):

**Card View Layout**:
- Cards in responsive grid
- 2 columns on desktop
- 1 column on tablet/mobile
- Card height: Variable (200-300px)
- 16px gap between cards

**Table View Layout**:
- Full width table
- Fixed header row
- Scrollable body
- Row height: 60px
- Hover highlight
- Click to expand details

**Request Detail Modal**:
- Overlay with backdrop
- 80% screen width (max 1200px)
- 90% screen height
- Two-column internal layout
- Sticky footer with actions

#### **4.2.3 Connections Layout**

**Connection Cards Grid**:
- Responsive card grid
- 3 columns on desktop
- 2 on tablet
- 1 on mobile
- Card size: 400px x 250px
- Status indicator prominent

**Configuration Modal**:
- Tabbed interface
- 60% screen width
- Scrollable content area
- Form layout within tabs
- Validation messages inline

### **4.3 Component Specifications**

#### **4.3.1 Navigation Components**

**Main Navigation Menu**:
- Icon + Label format
- Active state indication
- Hover effects
- Badge for notifications
- Nested sub-items support

**Quick Stats Section**:
- Compact metric display
- Real-time updates
- Click to navigate
- Color-coded status

#### **4.3.2 Content Components**

**Request Card**:
- Header with metadata
- Body with preview
- Footer with actions
- Status badges
- Confidence indicator
- Priority marker

**Data Tables**:
- Sortable columns
- Resizable columns
- Row selection
- Inline actions
- Pagination controls
- Export functionality

**Forms and Inputs**:
- Label above field
- Help text below
- Validation inline
- Required field indicators
- Smart defaults
- Autocomplete support

#### **4.3.3 Assistant Components**

**Chat Interface**:
- Message bubbles
- Timestamp display
- Typing indicator
- Code formatting
- Link rendering
- Scroll to bottom

**Suggestion Cards**:
- Icon indicator
- Brief description
- Action button
- Dismiss option
- Learn more link

### **4.4 Visual Hierarchy**

#### **4.4.1 Typography Scale**

**Headers**:
- Page title: 24px, bold
- Section header: 20px, semibold
- Card header: 16px, semibold
- Subsection: 14px, medium

**Body Text**:
- Primary content: 14px, regular
- Secondary content: 13px, regular
- Helper text: 12px, regular
- Timestamps: 11px, regular

#### **4.4.2 Color Usage**

**Primary Actions**: Blue (#2563EB)
- Submit buttons
- Primary CTAs
- Active selections
- Links

**Status Colors**:
- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Info: Blue (#3B82F6)

**Priority Indicators**:
- Highest: Red background
- High: Orange background
- Medium: Yellow background
- Low: Gray background

#### **4.4.3 Spacing System**

**Consistent Spacing Units**:
- Extra small (xs): 4px
- Small (sm): 8px
- Medium (md): 16px
- Large (lg): 24px
- Extra large (xl): 32px
- 2x Extra large (2xl): 48px

**Application**:
- Between sections: xl (32px)
- Between cards: md (16px)
- Internal card padding: md (16px)
- Between form fields: lg (24px)
- Between buttons: sm (8px)

### **4.5 Interactive Elements**

#### **4.5.1 Buttons**

**Primary Button**:
- Solid background
- White text
- Rounded corners (6px)
- Height: 36px
- Padding: 0 16px
- Hover: Darken 10%
- Active: Darken 20%
- Disabled: 50% opacity

**Secondary Button**:
- Transparent background
- Colored border
- Colored text
- Same dimensions as primary

**Icon Button**:
- Square shape
- 32px x 32px
- Icon centered
- Tooltip on hover

#### **4.5.2 Input Controls**

**Text Input**:
- Height: 36px
- Border: 1px solid
- Rounded corners (4px)
- Padding: 0 12px
- Focus: Blue border
- Error: Red border

**Dropdown Select**:
- Same as text input
- Chevron icon right
- Dropdown panel shadow
- Maximum height: 300px
- Scrollable if needed

**Toggle Switch**:
- Width: 44px
- Height: 24px
- Animated transition
- Clear on/off state

#### **4.5.3 Feedback Elements**

**Toast Notifications**:
- Top right position
- Slide in animation
- Auto-dismiss after 5s
- Manual close option
- Stack if multiple

**Loading States**:
- Inline spinners (20px)
- Skeleton screens
- Progress bars
- Loading overlays
- Shimmer effects

**Empty States**:
- Centered illustration
- Descriptive text
- Suggested action
- Consistent styling

This comprehensive design document provides clear guidance for understanding the product's purpose, user workflows, detailed features, and visual layout specifications, enabling developers and designers to build a consistent and effective user interface for the DataOps JIRA Agent.
