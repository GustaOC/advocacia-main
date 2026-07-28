const fs = require('fs');

const file = 'components/tasks-module.tsx';
let content = fs.readFileSync(file, 'utf8');

// The column header is: <h3 className="font-bold text-brand text-lg">{column.title}</h3>
// but it's inside <Card className={`bg-gradient-to-r ${column.color} border-0 shadow-lg`}>
// Since 'Pendente' column has color: 'from-brand-black to-brand-black/90'
// we need to make the text color dynamic or just light for black backgrounds.
// The easiest fix is to change the color in the columns array:
content = content.replace(/\{ id: 'Pendente', title: 'Pendente', color: 'from-brand-black to-brand-black\/90' \},/, "{ id: 'Pendente', title: 'Pendente', color: 'from-brand-black to-brand-black/90 text-white' },");
content = content.replace(/<h3 className="font-bold text-brand text-lg">/g, '<h3 className={`font-bold text-lg ${column.color.includes("brand-black") ? "text-white" : "text-brand"}`}>');

fs.writeFileSync(file, content);
console.log('Tasks Kanban header color fixed.');
