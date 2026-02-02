// import { useEffect, useState } from "react"
// import { supabase } from "../../services/supabaseClient"
// import { Link } from "react-router-dom"

// export default function Products() {
//   const [products, setProducts] = useState([])

//   const fetchProducts = async () => {
//     const { data, error } = await supabase.from("products").select("*")
//     if (error) console.log(error)
//     else setProducts(data)
//   }

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this product?")) return

//     const { error } = await supabase.from("products").delete().eq("id", id)
//     if (error) console.log(error)
//     else fetchProducts()
//   }

//   useEffect(() => {
//     fetchProducts()
//   }, [])

//   return (
//     <div>
//       <h2>Products</h2>
//       <Link to="/admin/add-product">Add New Product</Link>
//       <table>
//         <thead>
//           <tr>
//             <th>Name</th>
//             <th>Price</th>
//             <th>Stock</th>
//             <th>Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {products.map((p) => (
//             <tr key={p.id}>
//               <td>{p.name}</td>
//               <td>${p.price}</td>
//               <td>{p.stock}</td>
//               <td>
//                 <Link to={`/admin/edit-product/${p.id}`}>Edit</Link>
//                 <button onClick={() => handleDelete(p.id)}>Delete</button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   )
// }
