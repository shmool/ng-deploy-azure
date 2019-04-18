import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { clearCreds } from '../util/azure/auth';

// Call the createBuilder() function to create a builder. This mirrors
// createJobHandler() but add typings specific to Architect Builders.
export default createBuilder<any>(
    async (builderConfig: any, context: BuilderContext): Promise<BuilderOutput> => {
        // The project root is added to a BuilderContext.

        await clearCreds();
        context.logger.info('Cleared Azure credentials from cache.');
        return { success: true };
    }
);
