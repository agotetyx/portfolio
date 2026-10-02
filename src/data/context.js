import projects from './projects/index.js';

// Context the chat assistant answers from (was GET /api/context on the old backend).
export default {
  name: "Anurag Gotety",
  role: "Full-Stack Engineer",
  skills: [
    "React Native", "Three.js", "Node.js", "TensorFlow", "MongoDB",
    "Unity", "C#", "UI/UX", "Express.js", "Django", "AWS"
  ],
  projects: projects.map(p => ({
    title: p.title,
    description: p.short || '',
    long: p.long || ''
  }))
};
