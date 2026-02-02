// import { useState } from "react"
// import { supabase } from "../../services/supabaseClient"
// import { useNavigate } from "react-router-dom"

// export default function AddProduct() {
//   const navigate = useNavigate()
//   const [name, setName] = useState("")
//   const [price, setPrice] = useState("")
//   const [stock, setStock] = useState("")
//   const [colors, setColors] = useState("")
//   const [description, setDescription] = useState("")
//   const [image, setImage] = useState(null)

//   const handleAddProduct = async (e) => {
//     e.preventDefault()

//     // Upload image to Supabase Storage
//     let imageUrl = ""
//     if (image) {
//       const fileName = `${Date.now()}_${image.name}`
//       const { data, error } = await supabase.storage
//         .from("product-images")
//         .upload(fileName, image)
//       if (error) {
//         console.log(error)
//         return
//       }
//       imageUrl = data.path
//     }

//     // Insert product
//     const { error } = await supabase.from("products").insert([
//       {
//         name,
//         price,
//         stock,
//         colors: colors.split(",").map((c) => c.trim()),
//         description,
//         image_url: imageUrl,
//       },
//     ])
//     if (error) console.log(error)
//     else navigate("/admin/products")
//   }

//   return (
//     <form onSubmit={handleAddProduct}>
//       <h2>Add Product</h2>
//       <input placeholder="Name" onChange={(e) => setName(e.target.value)} />
//       <input placeholder="Price" type="number" onChange={(e) => setPrice(e.target.value)} />
//       <input placeholder="Stock" type="number" onChange={(e) => setStock(e.target.value)} />
//       <input placeholder="Colors (comma-separated)" onChange={(e) => setColors(e.target.value)} />
//       <textarea placeholder="Description" onChange={(e) => setDescription(e.target.value)} />
//       <input type="file" onChange={(e) => setImage(e.target.files[0])} />
//       <button type="submit">Add Product</button>
//     </form>
//   )
// }
