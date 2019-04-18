import { SchematicsException, Tree } from '@angular-devkit/schematics';
import { experimental, JsonParseMode, parseJson } from '@angular-devkit/core';
import { WorkspaceProject } from 'schematics-utilities';

export class AngularWorkspace {
    tree: Tree;
    workspacePath: string;
    schema: experimental.workspace.WorkspaceSchema;
    content: string;
    projectName: string;
    project: WorkspaceProject;
    target: string;
    configuration: string;
    path: string;

    constructor(tree: Tree, options: any) {
        this.tree = tree;
        this.workspacePath = this.getPath();
        this.content = this.getContent();
        this.schema = this.getWorkspace();
        this.projectName = this.getProjectName(options);
        this.project = this.getProject(options);
        this.target = 'build'; // TODO allow configuration of other options
        this.configuration = 'production';
        this.path = this.project.architect ? this.project.architect[this.target].options.outputPath : `dist/${ this.projectName }`;
    }

    getPath() {
        const possibleFiles = ['/angular.json', '/.angular.json'];
        const path = possibleFiles.filter(file => this.tree.exists(file))[0];
        return path;
    }

    getContent() {
        const configBuffer = this.tree.read(this.workspacePath);
        if (configBuffer === null) {
            throw new SchematicsException(`Could not find angular.json`);
        }
        return configBuffer.toString();
    }

    getWorkspace() {
        let schema: experimental.workspace.WorkspaceSchema;
        try {
            schema = parseJson(
                this.content,
                JsonParseMode.Loose
            ) as {} as experimental.workspace.WorkspaceSchema;
        } catch (e) {
            throw new SchematicsException(`Could not parse angular.json: ` + e.message);
        }

        return schema;
    }

    getProjectName(options: any) {
        let projectName = options.project;

        if (!projectName) {
            if (this.schema.defaultProject) {
                projectName = this.schema.defaultProject;
            } else {
                throw new SchematicsException('No project selected and no default project in the workspace');
            }
        }

        return projectName;
    }

    getProject(options: any) {

        const project = this.schema.projects[this.projectName];
        if (!project) {
            throw new SchematicsException('Project is not defined in this workspace');
        }

        if (project.projectType !== 'application') {
            throw new SchematicsException(`Deploy requires a project type of "application" in angular.json`);
        }

        if (!project.architect ||
            !project.architect.build ||
            !project.architect.build.options ||
            !project.architect.build.options.outputPath) {
            throw new SchematicsException(
                `Cannot read the output path (architect.build.options.outputPath) of project "${ this.projectName }" in angular.json`);
        }

        return project;
    }

}


export function addDeployToProject(workspace: AngularWorkspace) {
    if (!workspace || !workspace.project || !workspace.project.architect) {
        throw new SchematicsException('An error has occurred while retrieving project configuration.');
    }

    workspace.project.architect['deploy'] = {
        builder: 'ng-deploy-azure:deploy',
        options: {
            host: 'Azure',
            type: 'static',
            config: 'azure.json'
        }
    };

    workspace.project.architect['logout'] = {
        builder: 'ng-deploy-azure:logout'
    };

    workspace.tree.overwrite(workspace.workspacePath, JSON.stringify(workspace.schema, null, 2));
}


