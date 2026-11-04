// Sample campus-store products used by seed.js and generateImages.js.
const img = (slug) => `/assets/images/products/${slug}.svg`;
const P = (slug, name, category, price, stock, description, extra = {}) => ({
  slug, name, category, price, stock, description, imageUrl: img(slug), isActive: true, isFeatured: false, ...extra,
});

module.exports = [
  P('a4-ruled-notebook', 'A4 Ruled Notebook (200 pages)', 'Stationery', 80, 120, 'Smooth 70 GSM paper with a sturdy spiral binding. Ideal for lecture notes.', { isFeatured: true }),
  P('gel-pen-pack', 'Gel Pen Pack (10 pcs)', 'Stationery', 100, 80, 'Ten blue gel pens with a quick-dry 0.5 mm tip for clean, smudge-free writing.'),
  P('highlighter-set', 'Highlighter Set (4 colours)', 'Stationery', 120, 40, 'Four bright chisel-tip highlighters for revision season.'),
  P('data-structures-made-simple', 'Data Structures Made Simple', 'Books', 450, 25, 'Beginner-friendly guide to arrays, linked lists, trees and graphs with solved examples.', { isFeatured: true }),
  P('engineering-maths-guide', 'Engineering Mathematics Guide', 'Books', 380, 18, 'Unit-wise notes and previous-year questions for first and second year.'),
  P('lab-record-book', 'Lab Record Book (Engineering)', 'Books', 150, 60, 'Ruled and plain pages with an index table, ready for lab experiments.'),
  P('peanut-chikki-bar', 'Peanut Chikki Bar', 'Snacks', 20, 200, 'Crunchy jaggery and peanut bar - the classic study-break snack.', { isFeatured: true }),
  P('masala-cashew-pack', 'Masala Cashew Pack (80 g)', 'Snacks', 90, 55, 'Roasted cashews with a light masala coating.'),
  P('oats-honey-granola-bar', 'Oats & Honey Granola Bar', 'Snacks', 40, 150, 'Chewy oat bar sweetened with honey. No artificial colours.'),
  P('filter-coffee-sachets', 'Filter Coffee Sachets (Pack of 5)', 'Beverages', 75, 90, 'South Indian style filter coffee decoction sachets. Just add hot milk.', { isFeatured: true }),
  P('cold-coffee-can', 'Cold Coffee Can (200 ml)', 'Beverages', 55, 4, 'Ready-to-drink chilled coffee. Limited stock!'),
  P('lemon-iced-tea', 'Lemon Iced Tea (250 ml)', 'Beverages', 35, 100, 'Refreshing lemon iced tea with real tea extract.'),
  P('usb-c-cable', 'USB-C Charging Cable (1 m)', 'Accessories', 199, 35, 'Fast-charging braided cable that also transfers data.', { isFeatured: true }),
  P('usb-flash-drive-32gb', 'USB Flash Drive 32 GB', 'Accessories', 450, 22, 'Compact USB 3.0 pen drive for assignments and project files.'),
  P('laptop-sleeve-14', 'Laptop Sleeve (14 inch)', 'Accessories', 599, 12, 'Padded water-resistant sleeve with a soft inner lining.'),
  P('kmart-water-bottle', 'KMart Water Bottle (750 ml)', 'College Essentials', 249, 45, 'BPA-free bottle with a leak-proof cap and the KMart logo.', { isFeatured: true }),
  P('id-card-lanyard', 'ID Card Lanyard & Holder', 'College Essentials', 60, 70, 'Adjustable lanyard with a transparent card holder.'),
  P('scientific-calculator', 'Scientific Calculator', 'College Essentials', 899, 0, '240-function scientific calculator allowed in most exams. Currently out of stock.'),
];
