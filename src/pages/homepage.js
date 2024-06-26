import React, { useState, useEffect, useRef } from 'react';
import { Modal } from "flowbite-react";
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore"; 
import catAd from "../imgs/adoptAd.gif";

import { Navbar } from './navbar';
import { db } from '../firebaseConfig.js';
import '../style/home.css';
import loadingSpinner from "../imgs/loadingSpinner.gif";
import { fetchUserInfo, getUserPost, likePost, addComment, loadComment } from "./userHelper.js";
import { handleImageUpload, getDate, setAlert } from './helpers.js';

import { FaRegComment } from "react-icons/fa";
import { IoIosSend, IoIosAddCircleOutline } from "react-icons/io";
import { AiOutlineLike } from "react-icons/ai";

export const Home = () =>{
    const [isLoading, setIsLoading] = useState(true);
    const [userPost, setUserPost] = useState({
        "title": "My dumb owner didn't put a title",
        "desc": "My owner didn't have anything to say. I'm not surprised, they have a small brain.",
        "img": null,
        "pfp": null,
    })
    const [feedPost, setFeedPost] = useState([]); //feed post on the homepage
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [postPopup, setPostPopup] = useState(false); //visbiilty of creating a new post popup
    const [userPopup, setUserPopup] = useState(false); //visbility of seeing a users profile popup
    const [commentPopup, setCommentPopup] = useState(false); //visbility of the comment popup
    const [userProfilePost, setUserProfilePost] = useState([]); //user post popup
    const [userComment, setUserComment] = useState(""); //comment that user submited
    const [comments, setComments] = useState([]); //comments on the post 
    const [currPostId, setCurrPostId] = useState(""); //stores the id of the post that the user is interacting with
    const [usersFriend, setUsersFriend] = useState([]);

    const [alertPopup, setAlertPopup] = useState(false); //notification popups
    const [alertMsg, setAlertMsg] = useState("");
    //setting values when you click on a username to see their profile
    const [userProfile, setUserProfile] = useState({ 
        name: "",
        desc: "",
        date: "",
        img: null,
    })
    
    const setNewPost = (postField, userInput) =>{
        setUserPost(prevDate => ({
            ...prevDate,
            [postField]: userInput
        }))
    }

    const toggleCommentPopup = async (postId) => {
        console.log(postId);
        // Open the clicked comment popup
        setCurrPostId(postId);
        setComments(await loadComment(postId));
        setCommentPopup(!commentPopup);
    };

    //loads the current post on the homepage
    const isMounted = useRef(true);
    useEffect(() => {
        if (isMounted.current) {
            getFeed();
            getSuggestedUsers();
            isMounted.current = false;
        }
    }, [feedPost]);

    //creates new post 
    const handleSubmit = async (e) => {
        e.preventDefault();
    
        //generate new doc id to give both of our docs in the homepage feed and user's post
        const newDocRef = doc(collection(db, "Homepage Feed"));
        const newDocId = newDocRef.id;
    
        //doc data
        const newPostData = {
            title: userPost.title,
            desc: userPost.desc,
            img: userPost.img,
            user: localStorage.getItem("userName"),
            date: getDate(),
            userPfp: localStorage.getItem("userPfp"),
            likeCount: 0,
            commentCount: 0,
        };
    
        try {
            //creates new doc in the homepage feed
            await setDoc(newDocRef, newPostData);
    
            //creates new doc in the user's post collection
            await setDoc(doc(db, "Users", localStorage.getItem("userEmail"), "post", newDocId), newPostData);
        } catch (error) {
            console.log("Error adding document: ", error);
        }
        getFeed();
        setPostPopup(false);
        setUserPost(userPost.img, "");
    };

    const handleImageUploadCallback = (compressedDataUrl) => {
        setUserPost(prevState => ({
            ...prevState,
            img: compressedDataUrl // Update only the pic field
        }));
    };

    //gets the post from firebase
    const getFeed = async () =>{
        setIsLoading(true);
        try{
            const post = await getDocs(collection(db, "Homepage Feed"));
            const postReceived = post.docs.map(doc =>({
                id: doc.id,
                title: doc.data().title,
                desc: doc.data().desc,
                img: doc.data().img,
                user: doc.data().user,
                date: doc.data().date,
                pfp: doc.data().userPfp,
                likeCount: doc.data().likeCount,
                commentCount: doc.data().commentCount
            }))
            setFeedPost(postReceived);
        }catch(error){
            console.log("error ", error);
        }
        setIsLoading(false);
    }

    //opens popup for user's profile
    const getProfile = async (userName) =>{
        const friendList = await getDocs(collection(db, "Users", localStorage.getItem("userEmail"), "friendList"))
        const friends = friendList.docs.map(doc =>({
            name: doc.data().name
        }))
        setUsersFriend(friends);
        setIsLoading(true);

        const userInfo = await fetchUserInfo(userName);
        if(userInfo && userInfo.length > 0){
            setUserProfile(userInfo[0]);
            setUserProfilePost(await getUserPost(userInfo[0].id));
            setUserPopup(true);  
        }
        setIsLoading(false);
    }

    const addUserComment = async () =>{
        addComment(userComment, currPostId);
        setComments(await loadComment(currPostId));
        getFeed();
    }

    //sends friend req to the current user popup
    const sendFriendReq = async (userName) =>{
        setIsLoading(true);
        let sentAlready = false;
        try{
            const userInfo = await fetchUserInfo(userName);
            if(userInfo && userInfo.length > 0){
                var userEmail = userInfo[0].id;
            }

            const reqs = await getDocs(collection(db, "Users", userEmail, "friendRequest"))
            reqs.forEach((req) =>{
                if(req.data().requestedUser === localStorage.getItem("userName")){
                    sentAlready = true;
                }
            })

            if(!sentAlready){
                await addDoc(collection(db, "Users", userEmail, "friendRequest"), {
                    requestedUser: localStorage.getItem("userName"),
                    reqUserPfp: localStorage.getItem("userPfp"),
                    reqUserDate: getDate()
                })
            }
        }catch(error){
            console.log("error ", error);
        }

        setIsLoading(false);
        if(sentAlready){
            setAlert(`You have already sent ${userName} a friend request 🙀`, setAlertMsg, setAlertPopup);
        }else{
            setAlert(`You have sent ${userName} a friend request 😸`, setAlertMsg, setAlertPopup);
        }
    }

    const likeUserPost = (postDoc, postUserName) =>{
        //ensures getFeed is called
        likePost(postDoc, postUserName).then(() =>{
            getFeed();
        })    
    }

    const getSuggestedUsers = async () => {
        //gets list of the user's current friends
        let usersFriend = [];
        const friendList = await getDocs(collection(db, "Users", localStorage.getItem("userEmail"), "friendList"))
        friendList.forEach((friend) =>{
            usersFriend.push(friend.data().name);
        })
        setIsLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, "Users"));
            const suggestedUsers = [];
    
            // Fetching names from the userinfo sub-collections
            for (const userDoc of usersSnapshot.docs) {
                const userInfoSnapshot = await getDocs(collection(userDoc.ref, "userInfo"));
                userInfoSnapshot.forEach(doc => {
                    //check that user is not being put into the pool
                    //or users on the user's friend list
                    if (doc.data().name !== localStorage.getItem("userName") && !usersFriend.includes(doc.data().name)) {
                        suggestedUsers.push({
                            name: doc.data().name,
                            pfp: doc.data().pic
                        })
                    }
                });
            }
            setSuggestedUsers(suggestedUsers.sort(() => 0.5 - Math.random()).slice(0, 3));
        } catch (error) {
            console.error("Error fetching names: ", error);
        }
        setIsLoading(false);
    };

    return (
        <div className="homeContainer">
            <button id="hiddenButton" style={{display:'none'}} onClick={() =>{console.log("btn being clicked")}}></button>
            {isLoading &&(
                <>
                    <div className="overlay" id="loadingOverlay"></div>
                    <Modal show={isLoading} className="loadingModal">
                        {/* <Modal.Header></Modal.Header> */}
                        <div className="modalBody">
                            <Modal.Body>
                                <img src={loadingSpinner} alt="loadingSpin"></img>
                            </Modal.Body> 
                        </div>
                        
                    </Modal>
                </>
            )}
            {alertPopup && (
                <>
                    <Modal show={alertPopup} onClose={() => setAlertPopup(false)} className="alertModal">
                        <Modal.Header className="modalHeader"></Modal.Header>
                            <div className="alertModalContainer">
                            <Modal.Body className="modalBody">
                                <p> {alertMsg} </p>
                            </Modal.Body>
                        </div>
                        
                    </Modal>
                </>
            )}
            {userPopup &&(
                <>
                    <div className="overlay" onClick={() => setUserPopup(false)}></div>
                    <Modal show={userPopup} onClose={() => setUserPopup(false)} className="userProfileModal">
                        <Modal.Header className="modalHeader"></Modal.Header>
                        <div className="userBodyModalContainer">
                            <Modal.Body>
                                <section className="profileContainer">
                                    <img src={userProfile.img} className="userPfp" alt="userPfp"/>
                                    <div className="profileDescContainer">
                                        <div className="profileNameDescContainer">
                                            <h1> {userProfile.name} </h1>
                                            <p id="userDesc"> {userProfile.desc} </p>
                                        </div>
                                        <div className="userButtons">
                                            <p id="userDate"> Member since: {userProfile.date} </p>
                                            {/* Check if userProfile.name is not in usersFriend */}
                                            {!usersFriend.some(friend => friend.name === userProfile.name) && (
                                                // Makes sure that you cannot add yourself to the friend's list
                                                userProfile.name !== localStorage.getItem("userName") && ( 
                                                    <button className="addFriendBtn" onClick={() => sendFriendReq(userProfile.name)}>+ Add Friend</button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </section>
                                <section className="userProfilePostContainer">
                                    {userProfilePost.map(post =>(
                                        <div key={post.id} className="userPostContainer">
                                            <div className="nameDateContainer">
                                                <h1 className="userPostName">{post.user}</h1>
                                                <p className="postDate">{post.date}</p>
                                            </div>
                                            <div className="postImgContainer">
                                                {post.img && (
                                                    <img src={post.img} alt="user post" className="imgPost"/>
                                                )}
                                            </div>
                                            <div className="postBodyContainer">
                                                <h2>{post.title}</h2>
                                                <p className="postDesc">{post.desc}</p>
                                                <div className="footerContainer">
                                                    <div className="likeComContainer" onClick={() =>{likeUserPost(post.id, post.user)}}>
                                                        <AiOutlineLike className="icons"/>
                                                        <p>{post.likeCount}</p>
                                                    </div>
                                                    <div className="likeComContainer" onClick={() => {toggleCommentPopup(post.id)}}>
                                                        <FaRegComment className="icons" id="commentIcon"/>
                                                        <p> {post.commentCount} </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            </Modal.Body>
                        </div>
                    </Modal>
                </>
            )}
            {postPopup && (
            <>
                <div className="overlay" onClick={() => setPostPopup(false)}></div>
                <Modal show={postPopup} onClose={() => setPostPopup(false)} className="newPostModal">
                    <Modal.Header className="modalHeader"></Modal.Header>
                    <div className="bodyModalContainer">
                        <h1> Create a meowtastic post! 😻</h1>
                        <Modal.Body>
                            <form className="newPost" onSubmit={handleSubmit}>
                                <div className="newPostContainer">
                                    <div className="userTextInput">
                                        <input type="text" placeholder="Title" onChange={(e) => setNewPost("title", e.target.value)} />
                                        <textarea placeholder="Description" onChange={(e) => setNewPost("desc", e.target.value)} />
                                    </div>
                                    <div className="userImgInput">
                                        <input type="file" placeholder="show your cat" onChange={(e) => handleImageUpload(e, handleImageUploadCallback)} />
                                        <img src={userPost.img} alt="chosen img"/>
                                    </div>
                                </div>
                                <button id="subBtn" type="submit">Post!</button>
                            </form>
                        </Modal.Body>
                    </div>  
                </Modal>
            </>
            )}
            {commentPopup && (
                <>
                    <div className="overlay" onClick={() => setCommentPopup(false)}></div>
                    {/* change className later */}
                    <Modal show={commentPopup} onClose={()=> setCommentPopup(false)} className="commentModal">
                        <Modal.Header className="modalHeader"></Modal.Header>
                        <Modal.Body>
                            <div className="bodyModalContainer">
                                <div className="currentPostContainer">
                                    {feedPost.map((post) => {
                                        if (post.id === currPostId) {
                                            return (
                                                <div key={post.id}>
                                                    <div className="postContainer">
                                                        <div className="userHeaderContainer">
                                                            <div className="imgContainer">
                                                                <img src={post.pfp} className="userPfp" onClick={() => getProfile(post.user)} alt="userpfp"/>
                                                            </div>
                                                            <div className="nameDateContainer">
                                                                <h2 className="userPostName" onClick={() => getProfile(post.user)}>{post.user}</h2>
                                                                <p className="postDate">{post.date}</p>
                                                            </div>     
                                                        </div>
                                                        <div className="imgContainer2">
                                                            {post.img && (
                                                                <img src={post.img} alt="user post" className="imgPost"/>
                                                            )}
                                                        </div>
                                                        <div className="captionContainer">
                                                            <h2>{post.title}</h2>
                                                            <p className="postDesc">{post.desc}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    // If no matching post is found, return null
                                    return null;
                                })}
                                </div>
                                <div className="commentContainer">
                                    <div className="commentHeaderContainer">
                                        <h1> Comments </h1>
                                        <p className="comments">
                                            {comments.map(comment =>(
                                                <div key={comment.id}>
                                                    <div className="pfpNameContainer">
                                                        <img src={comment.pfp} alt="userPfp" onClick={() =>{getProfile(comment.userCommentName)}}/>
                                                        <h2 onClick={() =>{getProfile(comment.userCommentName)}}> {comment.userCommentName} </h2>
                                                    </div>
                                                    <div className="commentDateContainer">
                                                        <p> {comment.comment} </p>
                                                        <p className="commentDate"> {comment.date} </p>
                                                    </div>
                                                </div> 
                                            ))}
                                        </p>
                                    </div>
                                    <div className="inputContainer">
                                        <input 
                                            type="text" 
                                            placeholder="Comment" 
                                            value={userComment} 
                                            onChange={(text)=> setUserComment(text.target.value)}
                                            onKeyDown={(e) =>{if(e.key === "Enter"){
                                                addUserComment();
                                                setUserComment("");}}}
                                            ></input>
                                        <IoIosSend className="icon" onClick={() => {
                                            addUserComment();
                                            setUserComment("");
                                            }}/> 
                                    </div>
                                </div> 
                            </div> 
                        </Modal.Body>
                    </Modal>
                </>
            )}
            <div className="tempBtnContainer"  onClick={() => setPostPopup(true)}>
                <IoIosAddCircleOutline className="postIcon"/>
                <p>New post</p>
            </div>
            <div className="pageContainer">
                <Navbar />
                <section className="postOuterContainer">
                    {feedPost.map((post) => (
                        <div key={post.id} className="postContainer">
                            <div className="postHeaderContainer">
                                <div className="imgContainer">
                                    <img src={post.pfp} onClick={() => getProfile(post.user)} className="userPfp" alt="userpfp"/>
                                </div>
                                <div className="nameDateContainer">
                                    <h1 className="userPostName" onClick={() => getProfile(post.user)}>{post.user}</h1>
                                    <p className="postDate">{post.date}</p>
                                </div>     
                            </div>
                            <div className="postImgContainer">
                                {post.img && (
                                    <img src={post.img} alt="user post" className="imgPost"/>
                                )}
                            </div>
                            <div className="postBodyContainer">
                                <h2>{post.title}</h2>
                                <p className="postDesc">{post.desc}</p>
                                <div className="footerContainer">
                                    <div className="likeComContainer" onClick={() => likeUserPost(post.id, post.user)}>
                                        <AiOutlineLike className="icons"/>
                                        <p> {post.likeCount} </p>
                                    </div>
                                    <div className="likeComContainer" onClick={() => toggleCommentPopup(post.id)}>
                                        <FaRegComment className="icons" id="commentIcon"/>
                                        <p> {post.commentCount} </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
                <section className="suggested">
                    <div className="catAdContainer">
                        <img id="catAd" src={catAd} alt="cat adopt ad"/>
                        <p> *not sponsored </p>
                    </div>
                    <div className="suggestedUsers">
                        <h1> Suggested Users </h1>
                        {suggestedUsers.map((users) =>(
                            <div key={users.key} className="userContainer">
                                <img src={users.pfp} alt="userPfp" onClick={()=> getProfile(users.name)}/>
                                <div className="userDescContainer">
                                    <h2 onClick={()=> getProfile(users.name)}> {users.name} </h2>
                                    <button className="addFriendBtn" onClick={() => sendFriendReq(users.name)}> + Add Friend </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
        );
        
}