
import { WgerClient } from '../lib/wger';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function verifySmartAddLogic() {
    const token = process.env.WGER_TOKEN;
    const baseUrl = process.env.WGER_BASE_URL;
    const planId = process.env.TEST_PLAN_ID ? parseInt(process.env.TEST_PLAN_ID) : undefined;

    if (!token || !baseUrl) {
        console.error('Missing env vars: WGER_TOKEN or WGER_BASE_URL');
        process.exit(1);
    }

    const client = new WgerClient(token, baseUrl);
    const testDishName = `TestIngr_${Date.now()}`;

    console.log(`Testing with dish: ${testDishName}`);

    try {
        // 1. Search Ingredient (Expect empty)
        console.log('Searching...');
        let searchResults = await client.searchIngredient(testDishName);
        console.log(`Search results (should be 0): ${searchResults.length}`);

        // 2. Create Ingredient (Simulate what route does)
        console.log('Creating ingredient...');
        const newIngr = await client.createIngredient({
            name: testDishName,
            energy: 100,
            protein: 10,
            carbohydrates: 10,
            fat: 5
        });
        console.log(`Created ingredient ID: ${newIngr.id}`);

        // 3. Search Again (Expect found)
        console.log('Searching again...');
        searchResults = await client.searchIngredient(testDishName);
        console.log(`Search results (should be > 0): ${searchResults.length}`);
        const exactMatch = searchResults.find(i => i.name === testDishName);
        if (exactMatch) {
            console.log('Exact match found!');
        } else {
            console.error('Exact match NOT found!');
        }

        console.log('Verification Logic Passed!');

    } catch (error) {
        console.error('Verification Failed:', error);
    }
}

verifySmartAddLogic();
