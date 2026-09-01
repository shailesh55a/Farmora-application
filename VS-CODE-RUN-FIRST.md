# Farmora — Run in VS Code first

## 1. Open the project
Extract the ZIP and open the `Farmora-application-main` folder in VS Code.

## 2. Create backend environment file
Copy:
`backend/.env.example` → `backend/.env`

Set at minimum:
- `GROQ_API_KEY=your_key`
- `AGMARKNET_API_KEY=your_data_gov_key`

Do not put these private keys in the frontend.

## 3. Create frontend environment file
Copy:
`frontend/.env.example` → `frontend/.env`

Keep:
`VITE_API_BASE_URL=http://localhost:5000/api`

For Google/Facebook login, fill the Firebase `VITE_FIREBASE_*` values if you have configured Firebase.

## 4. Install packages

Open Terminal 1:
```bash
cd backend
npm install
```

Open Terminal 2:
```bash
cd frontend
npm install
```

## 5. Start backend

Terminal 1:
```bash
cd backend
npm run dev
```

You should see:
`Farmora backend running on port 5000`

Test:
`http://localhost:5000/api/health`

## 6. Start frontend

Terminal 2:
```bash
cd frontend
npm run dev
```

Open the Vite URL shown in the terminal, normally:
`http://localhost:5173`

## 7. Test the important Farmora features

1. Open **Community** → the Fisheries filter is now inside Community; there is no separate Fisheries post section.
2. Open **Sevak** → ask crop, disease, fertilizer, pesticide, fish farming, pond, weather, price and general farming questions.
3. Pesticide answers can show reference images and provide **Google Images**, **Google Search**, and **Shop / Compare prices** links.
4. Open **Market** → prices come only from the live AGMARKNET/data.gov.in API. The app does not create demo mandi prices. Modal, minimum and maximum prices are displayed in both ₹/quintal and ₹/kg.
5. If Market says live data is unavailable, check `AGMARKNET_API_KEY` in `backend/.env` and restart the backend.

## Important
The AGMARKNET/data.gov.in feed is live only when a valid data.gov.in API key is configured. Never replace a missing live feed with sample prices for a hackathon demo.

For a clean restart, stop both terminals with `Ctrl+C` and start the backend first, then the frontend.
