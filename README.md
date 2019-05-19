# ng deploy Azure

Angular-CLI deploy to Azure

This angular schematic would allow you to deploy you Angular app to Azure static Hosting.

## Usage

Once ng-deploy-azure is published on npm, the instructions for using it directly on an Angular project will be added. 
At the moment, please follow the steps described in "Local development".

## Local development

Clone the project.
Install the dependencies: 

```sh
npm run install
```

Build the project with watch:

```sh
npm run start
```

-- or without watch:

```sh
npm run build
```

Create a local npm link:

```sh
npm link
```

### Adding to an Angular project - ng add

The schematic runs from within an Angular project. Enter the project's directory.

Run `ng --version`, make sure you have angular CLI version v8.0.0-beta.18 or greater. 
If needed, update the CLI:

```
ng update @angular/cli @angular/core --next=true

``` 

Make sure TypeScript is version 3.4.5 or greater. 

Link ng-deploy-azure:

```
npm link ng-deploy-azure
```

Add ng-deploy-azure by running: 

```sh
ng add ng-deploy-azure
```

This command will prompt you to login to Azure, select a subscription, 
and select or create the resource group and the storage account in which the app will be deployed.
If you choose to create a resource group and/or a storage account you will be asked to 
select the location for the resources and they will be created in your Azure account, 
configured for static hosting.
The command will add `azure.json` with the configuration and modify `angular.json` with the deploy commands. 

### Deploying

Once there's a valid `azure.json` file, you can deploy the app.

```sh
ng run <project-name>:deploy
```

If the build target is empty, the project will be built with the production option 
(similar to running `ng build --prod`).

Then, the project will be deployed to the storage account specified in `azure.json`.

In future versions of the Angular CLI you will be able to simply run `ng deploy`.

### Logging out from Azure

To clear the cached credentials run:
```sh
ng run <project-name>:logout
```

### Testing

Testing is done with Jest. To run your tests you type:

```
npm run test:jest
```
