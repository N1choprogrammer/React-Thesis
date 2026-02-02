// import { useEffect, useState } from "react"
// import { supabase } from "../../services/supabaseClient"
// import { useNavigate, useParams } from "react-router-dom"

// export default function EditProduct() {
//   const { id } = useParams()
//   const navigate = useNavigate()
//   const [product, setProduct] = useState(null)
//   const [name, setName] = useState("")
//   const [price, setPrice] = useState("")
//   const [stock, setStock] = useState("")
//   const [colors, setColors] = useState("")
//   const [description, setDescription] = useState("")
//   const [image, setImage] = useState(null)

//   useEffect(() => {
//     const fetchProduct = async () => {
//       const { data } = await supabase.from("products").select("*").eq("id", id).single()
//       setProduct(data)
//       setName(data.name)
//       setPrice(data.price)
//       setStock(data.stock)
//       setColors(data.colors.join(", "))
//       setDescription(data.description)
//     }
//     fetchProduct()
//   }, [id])

//   const handleEditProduct = async (e) => {
//     e.preventDefault()

//     let imageUrl = product.image_url
//     if (image) {
//       const fileName = `${Date.now()}_${image.name}`
//       const { data, error } = await supabase.storage
//         .from("product-images")
//         .upload(fileName, image, { upsert: true })
//       if (error) return console.log(error)
//       imageUrl = data.path
//     }

//     const { error } = await supabase
//       .from("products")
//       .update({
//         name,
//         price,
//         stock,
//         colors: colors.split(",").map((c) => c.trim()),
//         description,
//         image_url: imageUrl,
//       })
//       .eq("id", id)

//     if (error) console.log(error)
//     else navigate("/admin/products")
//   }

//   if (!product) return <p>Loading...</p>

//   return (
//     <form onSubmit={handleEditProduct}>
//       <h2>Edit Product</h2>
//       <input value={name} onChange={(e) => setName(e.target.value)} />
//       <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
//       <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
//       <input value={colors} onChange={(e) => setColors(e.target.value)} />
//       <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
//       <input type="file" onChange={(e) => setImage(e.target.files[0])} />
//       <button type="submit">Update Product</button>
//     </form>
//   )
// }
