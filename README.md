# ng deploy Azure

Angular-CLI deploy to Azure

This angular schematic would allow you to deploy you Angular app to Azure static Hosting.

## Installing 

Run `ng --version`, make sure you have angular CLI version greater than 8.

Add the schematic by running: 

```sh
ng add ng-deploy-azure
```

This command will prompt you to login to Azure and select or create the storage account.
It will add azure.json with the configuration and modify angular.json with the deploy commands. 

## Deploying

Once there's a valid `azure.json` file, you can deploy the app.
If the build target is empty, build will be run first.

```sh
ng run <project-name>:deploy
```

## Logout from Azure

To clear the cached credentials run:
```sh
ng run <project-name>:logout
```

## Local development

Build the project with watch:

```sh
npm run start
```

Create a local npm link of `ng-deploy-azure`:

```sh
npm link
```

Create a new Angular project with the Angular CLI. Make sure you're using the latest version.

```sh
ng new <project-name>
```

Link `ng-deploy-azure` to the project:

```sh
cd <project-name>
npm link ng-deploy-azure
```

Add the schematic and deploy as described above.

### Testing

To test locally, install `@angular-devkit/schematics-cli` globally and use the `schematics` command line tool. That tool acts the same as the `generate` command of the Angular CLI, but also has a debug mode.

Check the documentation with
```bash
schematics --help
```

### Unit Testing

`npm run test` will run the unit tests, using Jasmine as a runner and test framework.

