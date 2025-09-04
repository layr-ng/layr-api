
# Layr API

Hey there! Welcome to the Layr API repo.  
This is the backend that powers Layr — your AI-first sequence diagramming tool.  
If you’re here, you probably want to know two things:  
1. How to get it running.  
2. What the api endpoints are available and what they actually do.  

Let’s walk through it together.

---

## Getting the server running

First up: clone the repo, install dependencies, set up your environment, and you’re off.

```bash
git clone https://github.com/layr-ng/layr-api.git
cd layr-api
npm install
```

Next, copy `.env.example` to `.env` and fill in your values (DB URL, JWT secret, Flutterwave keys if you want to test payments).

Now, about migrations:  
We don’t ship migration files here. If you want to use migrations, you’ll need to set up Sequelize and create them yourself.  
Otherwise, you can just keep working in dev mode — it’s quick and easy for local development.

To start the server:

```bash
npm run dev
```

By default, it runs on [http://localhost:3000](http://localhost:3000).  
Congrats, your API is up and running!

---

## The routes explained

So, what can you actually do with this API? Here’s the rundown:

### Auth

Register, login, logout, reset password — all the basics.  
We use JWT for authentication. After you log in, session tokens are stored and retrieved from signed cookies.

### Users

Once you’re logged in, you can view and update your profile, or search for other users by email.  
Simple stuff, but you’ll use it a lot.

### Diagrams

This is the core of Layr.

* Create diagrams.
* Fetch them.
* Update them.
* Delete them when you’re done.

You can also share diagrams: make them public, hide them, or generate share links.  
Sequences are tied to diagrams too — feed prompts to generate new sequences, or update existing ones.

### Groups

Groups are like folders for your diagrams.  
Create them, update them, drop diagrams in.  
Straightforward, but handy.

### Teams

When you want to collaborate, teams are where it happens.

* Create a team.
* Invite members.
* Assign roles (owner, admin, member).
* Share diagrams in the team workspace.

It’s your shared space for working together.

### Subscriptions

This is where payments and pricing live.  
Handle pricing, discounts, create subscriptions, verify payments — all here.  
If you’re testing locally, you can mock Flutterwave calls.

---

## Contributing

Thinking about improving the repo? Awesome — that’s what open source is for.

A few ground rules:

* Stick to TypeScript, no sneaky JS.
* Follow the folder structure (`auth`, `diagram`, `team`, etc).
* Lint your code before pushing.
* Open a PR and explain your changes.

We’ll review, chat if needed, and merge when it’s ready.  
No gatekeeping — just clean code and clear communication.



## License
 This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](https://www.gnu.org/licenses/agpl-3.0.html).  
By contributing or deploying, you agree to the terms of the AGPL.


## Closing note

We want this API to stay approachable.  
Don’t treat it like a black box — read through the controllers, see how things flow, and you’ll get the hang of it quickly.

If you run into an issue, open one here on GitHub.  
And if you’re adding something new, keep it simple: write code like you’re explaining it to your future self.

That’s it. You’re all set!

