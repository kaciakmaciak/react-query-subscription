# Example

1. Create firestore database as per [docs](https://firebase.google.com/docs/firestore/quickstart#create).
1. Set environment variables:

   ```sh
   # Copy the template .env file to local .env file
   cp .env .env.local
   # Edit .env.local with firebase config.
   ```

1. Install dependencies (ideally in project root):

   ```sh
   npm install
   ```

   > If you are running the command directly in the `examples/firebase` directory, use ` --ignore-scripts`.

1. Run local dev server:

   ```sh
   npm run dev
   ```
