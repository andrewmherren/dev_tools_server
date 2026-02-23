// Shared TypeScript types for env-manager

export interface Tool {
    name: string;
    description: string;
    inputSchema: any;
    handler: (args: any) => Promise<ToolResponse>;
}

export interface ToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
    isError?: boolean;
}

export interface DockerService {
    container_name: string;
    build?: {
        context: string;
        dockerfile: string;
    };
    image?: string;
    volumes: string[];
    environment: string[];
    networks: string[];
    tty?: boolean;
    stdin_open?: boolean;
    depends_on?: string[];
}

// Docker Compose Configuration Types
export interface ServiceDefinition {
    container_name?: string;
    image?: string;
    build?: {
        context: string;
        dockerfile: string;
        args?: Record<string, string>;
    };
    volumes?: string[];
    environment?: string[] | Record<string, string>;
    env_file?: string | string[];
    ports?: string[];
    networks?: string[] | Record<string, { aliases?: string[] }>;
    depends_on?: string[] | Record<string, { condition: string }>;
    working_dir?: string;
    command?: string | string[];
    tty?: boolean;
    stdin_open?: boolean;
    restart?: string;
    labels?: Record<string, string>;
    [key: string]: any; // Allow other docker-compose fields
}

export interface DockerComposeConfig {
    version?: string;
    services: Record<string, ServiceDefinition>;
    networks?: Record<string, any>;
    volumes?: Record<string, any>;
}

export interface ContainerInfo {
    Name: string;
    Service: string;
    State: string;
    Status: string;
    Publishers?: Array<{
        URL: string;
        TargetPort: number;
        PublishedPort: number;
    }>;
}

export interface ProjectInfo {
    name: string;
    path: string;
    service: string;
    status: string;
    human_container?: string;
    agents: AgentInfo[];
}

export interface AgentInfo {
    name: string;
    service: string;
    container: string;
    status: string;
}
